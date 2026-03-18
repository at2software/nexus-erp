import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject, OnInit, OnDestroy, AfterViewInit, ViewChild } from '@angular/core';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { NexusModule } from '@app/nx/nexus.module';
import { PermissionsDirective } from '@directives/permissions.directive';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { ActivityTabComponent } from 'src/app/_activity/activity-tab.component';
import { REFLECTION } from 'src/constants/constants';
import { GlobalService } from 'src/models/global.service';
import { WidgetService } from 'src/models/widget.service';
import { MoneyShortPipe } from 'src/pipes/mshort.pipe';
import { Subject, takeUntil } from 'rxjs';
import { SafePipe } from 'src/pipes/safe.pipe';

@Component({
    selector: 'activity-tab-attention',
    templateUrl: './tab-attention.component.html',
    styleUrls: ['./tab-attention.component.scss'],
    standalone: true,
    imports: [ActivityTabComponent, ScrollbarComponent, NexusModule, CommonModule, DatePipe, NgbTooltipModule, MoneyShortPipe, PermissionsDirective, SafePipe]
})
export class TabAttentionComponent implements OnInit, AfterViewInit, OnDestroy {

    #destroy$ = new Subject<void>()

    // Expose the component class for type-safe tab switching
    readonly componentType = TabAttentionComponent

    @ViewChild(ActivityTabComponent) tabComponent: ActivityTabComponent

    newItems: any
    groupedItems: { date: string, displayDate: string, items: any[] }[] = []

    global = inject(GlobalService)
    #widgetService = inject(WidgetService)
    #knownItemCount = 0
    #initialized    = false
    interval: any

    ngAfterViewInit(): void {
        this.tabComponent.onFocus = () => {
            this.tabComponent.badge = undefined
            this.#knownItemCount = this.newItems?.length ?? 0
        }
    }

    ngOnInit(): void {
        this.global.init.pipe(takeUntil(this.#destroy$)).subscribe(() => {
            this.interval = setInterval(() => this.reload, 5000)
            this.reload()
        })
    }
    ngOnDestroy() {
        if (this.interval) {
            clearInterval(this.interval)
        }
        this.#destroy$.next()
        this.#destroy$.complete()
    }
    reload() {
        this.#widgetService.indexNewItems().pipe(takeUntil(this.#destroy$)).subscribe(r => {
            if (r) {
                this.newItems = r.map(_ => REFLECTION(_))
                this.groupItemsByDay()
                const count = this.newItems.length
                if (!this.#initialized) {
                    this.#initialized = true
                    this.#knownItemCount = count
                } else if (count > this.#knownItemCount) {
                    this.tabComponent.badge = '!'
                }
            }
        })
    }

    groupItemsByDay() {
        const groups: Record<string, any[]> = {}
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)

        this.newItems?.forEach((item: any) => {
            const itemDate = new Date(item.created_at)
            itemDate.setHours(0, 0, 0, 0)
            const dateKey = itemDate.toISOString().split('T')[0]

            if (!groups[dateKey]) {
                groups[dateKey] = []
            }
            groups[dateKey].push(item)
        })

        this.groupedItems = Object.keys(groups)
            .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
            .map(dateKey => {
                const itemDate = new Date(dateKey)
                let displayDate: string

                if (itemDate.getTime() === today.getTime()) {
                    displayDate = $localize`:@@i18n.common.today:today`
                } else if (itemDate.getTime() === yesterday.getTime()) {
                    displayDate = $localize`:@@i18n.common.yesterday:yesterday`
                } else {
                    displayDate = itemDate.toLocaleDateString()
                }

                return {
                    date: dateKey,
                    displayDate,
                    items: groups[dateKey]
                }
            })
    }

}
