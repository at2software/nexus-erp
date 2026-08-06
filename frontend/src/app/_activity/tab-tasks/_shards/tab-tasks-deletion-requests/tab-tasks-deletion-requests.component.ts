import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { modelListResource } from '@models/http/model-resource';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { debounceTime, filter } from 'rxjs/operators';
import { DeletionRequest } from '@models/deletion-request/deletion-request.model';
import { DeletionRequestService } from '@models/deletion-request/deletion-request.service';
import { WebSocketService } from '@services/websocket.service';
import { TabTasksBaseComponent } from '../tab-tasks-base.component';
import { AvatarComponent } from '@shards/avatar/avatar.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'tab-tasks-deletion-requests',
    templateUrl: './tab-tasks-deletion-requests.component.html',
    imports: [AvatarComponent, NgbTooltipModule],
})
export class TabTasksDeletionRequestsComponent extends TabTasksBaseComponent {
    #service = inject(DeletionRequestService);
    #ws = inject(WebSocketService);

    #requests = modelListResource(this.ready, () => this.#service.indexPending());
    requests = this.#requests.value;

    constructor() {
        super();
        this.#ws.dataChanged$
            .pipe(
                filter((p) => p.class === 'DeletionRequest' && (p.event === 'created' || p.event === 'deleted')),
                debounceTime(300),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe(() => this.reload());

        effect(() => this.countChanged.emit(this.requests().length));
    }

    override reload() {
        this.#requests.reload();
    }

    approve(req: DeletionRequest) {
        this.#service.approve(req).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.reload());
    }

    reject(req: DeletionRequest) {
        req.modalConfirm(
            $localize`:@@i18n.common.attention:attention`,
            $localize`:@@i18n.deletionRequest.reallyReject:Reject this deletion request?`,
        )
            .then(() => req.delete().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.reload()))
            .catch(() => undefined);
    }
}
