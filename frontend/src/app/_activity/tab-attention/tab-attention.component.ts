import { DatePipe } from '@angular/common';
import { debounceTime, filter } from 'rxjs/operators';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { Nx } from '@app/nx/nx.directive';
import { NComponent } from '@shards/n/n.component';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import { PermissionsDirective } from '@directives/permissions.directive';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { ActivityTabComponent } from '@activity/activity-tab.component';
import { REFLECTION } from '@constants/constants';
import { GlobalService } from '@models/global.service';
import { WidgetService } from '@models/widget.service';
import { MoneyShortPipe } from '@pipes/mshort.pipe';
import { SafePipe } from '@pipes/safe.pipe';
import { WebSocketService } from 'src/services/websocket.service';
import type { Serializable } from '@models/serializable';
import { Comment } from '@models/comment/comment.model';
import { Invoice } from '@models/invoice/invoice.model';
import { Company } from '@models/company/company.model';
import { Project } from '@models/project/project.model';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'activity-tab-attention',
    templateUrl: './tab-attention.component.html',
    styleUrls: ['./tab-attention.component.scss'],
    imports: [ActivityTabComponent, ScrollbarComponent, Nx, NComponent, AvatarComponent, DatePipe, NgbTooltipModule, MoneyShortPipe, PermissionsDirective, SafePipe],
})
export class TabAttentionComponent {
    #widgetService = inject(WidgetService);
    #globalInit = inject(GlobalService).init;
    #ws = inject(WebSocketService);
    #knownItemCount = 0;
    #initialized = false;
    #untilDestroyed = takeUntilDestroyed();

    // frontend `class` names of the models surfaced in this feed
    #watchedClasses = new Set(['Comment', 'Invoice', 'Company', 'Project']);

    readonly componentType = TabAttentionComponent;
    readonly tabComponent = viewChild.required(ActivityTabComponent);

    
    protected readonly Comment = Comment;
    protected readonly Invoice = Invoice;
    protected readonly Company = Company;
    protected readonly Project = Project;

    newItems = signal<Serializable[]>([]);
    groupedItems = computed(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTime = today.getTime();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayTime = yesterday.getTime();

        const groups: Record<string, Serializable[]> = {};
        for (const item of this.newItems()) {
            const itemDate = new Date(item.created_at);
            itemDate.setHours(0, 0, 0, 0);
            const dateKey = itemDate.toISOString().split('T')[0];
            (groups[dateKey] ??= []).push(item);
        }

        return Object.keys(groups)
            .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
            .map((dateKey) => {
                const itemDate = new Date(dateKey);
                const itemDateOnly = itemDate.getTime();
                const displayDate = itemDateOnly === todayTime
                    ? $localize`:@@i18n.common.today:today`
                    : itemDateOnly === yesterdayTime
                        ? $localize`:@@i18n.common.yesterday:yesterday`
                        : itemDate.toLocaleDateString();
                return { date: dateKey, displayDate, items: groups[dateKey] };
            });
    });

    constructor() {
        effect(() => {
            const tab = this.tabComponent();
            if (!tab) return;
            untracked(() => {
                tab.onFocus = () => {
                    tab.badge.set(undefined);
                    this.#knownItemCount = this.newItems().length;
                };
            });
        });
        this.#globalInit.subscribe(() => {
            this.reload();
            // refresh only when a watched type is created or deleted - 'updated' now also
            // fires on every $touches cascade (e.g. an invoice item save touching its project)
            // and would reload this feed far too often for no visible change.
            this.#ws.dataChanged$
                .pipe(
                    filter((payload) => this.#watchedClasses.has(payload.class) && (payload.event === 'created' || payload.event === 'deleted')),
                    debounceTime(500),
                    this.#untilDestroyed,
                )
                .subscribe(() => this.reload());
        });
    }

    reload() {
        this.#widgetService
            .indexNewItems()
            .subscribe((r) => {
                if (!r) return;
                this.newItems.set(r.map((_) => REFLECTION(_)));
                const count = this.newItems().length;
                if (!this.#initialized) {
                    this.#initialized = true;
                    this.#knownItemCount = count;
                } else if (count > this.#knownItemCount) {
                    this.tabComponent().badge.set('!');
                }
            });
    }
}
