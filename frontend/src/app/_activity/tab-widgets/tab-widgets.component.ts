import { Component, ViewChild, inject, OnInit } from '@angular/core';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { ActivityTabComponent } from 'src/app/_activity/activity-tab.component';
import { WidgetFactory, TAWidget } from '@dashboard/availableWidgets';
import { CommonModule } from '@angular/common';
import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { NxGlobal } from 'src/app/nx/nx.global';
import { GlobalService } from 'src/models/global.service';
import { ActivatedRoute } from '@angular/router';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
    selector: 'activity-tab-widgets',
    templateUrl: './tab-widgets.component.html',
    styleUrls: ['./tab-widgets.component.scss'],
    standalone: true,
    imports: [ActivityTabComponent, ScrollbarComponent, CommonModule, CdkDrag, CdkDropList, NgbTooltipModule]
})
export class TabWidgetsComponent implements OnInit {

    @ViewChild(ActivityTabComponent) tab:ActivityTabComponent

    global = inject(GlobalService)
    route = inject(ActivatedRoute)
    isEditMode: boolean = false
    currentDashboard: number = 0
    allWidgets:TAWidget[]
    usedWidgetKeys = new Set<string>()

    isUsedWidget = (widgetKey:string):boolean => this.usedWidgetKeys.has(widgetKey)

    ngOnInit() {
        this.route.params.subscribe(_ => {
            if ('dashboard' in _) {
                this.currentDashboard = parseInt(_['dashboard'])
            } else {
                this.currentDashboard = 0
            }
        })

        NxGlobal.dashboardEditMode$.subscribe((isEditing:boolean) => {
            this.isEditMode = isEditing
            if (this.tab) {
                if (isEditing) {
                    this.usedWidgetKeys.clear()
                    if (this.global.dashboards && this.global.dashboards[this.currentDashboard]) {
                        this.global.dashboards[this.currentDashboard].cols.forEach((col: any[]) => {
                            col.forEach((widget: any) => {
                                this.usedWidgetKeys.add(widget.widget)
                            })
                        })
                    }
                    this.allWidgets = WidgetFactory.availableWidgets()
                    this.tab.show()
                } else {
                    this.tab.hide()
                }
            }
        })
    }
}
