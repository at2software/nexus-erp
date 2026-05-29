import { DatePipe } from '@angular/common';
import { timer } from 'rxjs';
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

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'activity-tab-attention',
    templateUrl: './tab-attention.component.html',
    styleUrls: ['./tab-attention.component.scss'],
    standalone: true,
    imports: [ActivityTabComponent, ScrollbarComponent, Nx, NComponent, AvatarComponent, DatePipe, NgbTooltipModule, MoneyShortPipe, PermissionsDirective, SafePipe],
})
export class TabAttentionComponent {
    #widgetService = inject(WidgetService);
    #globalInit = inject(GlobalService).init;
    #knownItemCount = 0;
    #initialized = false;
    #untilDestroyed = takeUntilDestroyed();

    readonly componentType = TabAttentionComponent;
    readonly tabComponent = viewChild.required(ActivityTabComponent);

    newItems = signal<any[]>([]);
    groupedItems = computed(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTime = today.getTime();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayTime = yesterday.getTime();

        const groups: Record<string, any[]> = {};
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
            timer(0, 60000).pipe(this.#untilDestroyed).subscribe(() => this.reload());
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
