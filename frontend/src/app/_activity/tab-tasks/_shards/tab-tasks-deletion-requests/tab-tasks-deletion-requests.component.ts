import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { debounceTime, filter } from 'rxjs/operators';
import { DeletionRequest } from '@models/deletion-request/deletion-request.model';
import { DeletionRequestService } from '@models/deletion-request/deletion-request.service';
import { WebSocketService } from 'src/services/websocket.service';
import { TabTasksBaseComponent } from '../tab-tasks-base.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'tab-tasks-deletion-requests',
    templateUrl: './tab-tasks-deletion-requests.component.html',
    imports: [NgbTooltipModule],
})
export class TabTasksDeletionRequestsComponent extends TabTasksBaseComponent {
    requests = signal<DeletionRequest[]>([]);

    #service = inject(DeletionRequestService);
    #ws = inject(WebSocketService);

    constructor() {
        super();
        // Live-refresh when any user creates/approves/rejects a request.
        this.#ws.dataChanged$
            .pipe(
                filter((p) => p.class === 'DeletionRequest' && (p.event === 'created' || p.event === 'deleted')),
                debounceTime(300),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe(() => this.reload());
    }

    override reload() {
        this.#service
            .indexPending()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((r) => {
                this.requests.set(r);
                this.countChanged.emit(r.length);
            });
    }

    approve(req: DeletionRequest) {
        this.#service.approve(req).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.reload());
    }

    reject(req: DeletionRequest) {
        // modalConfirm() rejects on cancel, so only the resolve path proceeds.
        req.modalConfirm(
            $localize`:@@i18n.common.attention:attention`,
            $localize`:@@i18n.deletionRequest.reallyReject:Reject this deletion request?`,
        )
            .then(() => this.#service.destroy(req).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.reload()))
            .catch(() => undefined);
    }
}
