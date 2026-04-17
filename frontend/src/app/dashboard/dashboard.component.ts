import { Component, DestroyRef, HostBinding, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InputModalService } from '@app/_modals/modal-input/modal-input.component';
import { GlobalService } from 'src/models/global.service';
import { ParamService } from 'src/models/param.service';
import { Project } from 'src/models/project/project.model';
import { User } from 'src/models/user/user.model';
import { ConfirmationService } from '@app/_modals/modal-confirm/confirmation.service';
import { TWidget, WidgetFactory } from '@dashboard/availableWidgets';
import { ActivatedRoute } from '@angular/router';
import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { NxGlobal } from 'src/app/nx/nx.global';
import { HeaderModule } from '@app/app/header/header.module';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { CommonModule } from '@angular/common';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { BaseWidgetListener } from './widgets/base.widget.listener';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { ActivityService } from '@app/_activity/activity.service';
import { TabAttentionComponent } from '@app/_activity/tab-attention/tab-attention.component';
import { GuidedTourComponent } from '@shards/guided-tour/guided-tour.component';
import { WidgetSuperadminWarningComponent } from './widgets/widget-superadmin-warning/widget-superadmin-warning.component';

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss'],
    standalone: true,
    imports: [HeaderModule, ToolbarComponent, ScrollbarComponent, CommonModule, CdkDropList, EmptyStateComponent, NgbDropdownModule, CdkDrag, CdkDropList, GuidedTourComponent, WidgetSuperadminWarningComponent],
})
export class DashboardComponent implements OnInit {

    #destroyRef = inject(DestroyRef)

    @HostBinding('class.is_editing') is_editing: boolean = false

    currentDashboard = 0
    team: User[]
    acquisitions: Project[] = []
    projects: Project[] = []
    timeBased: Project[] = []
    indices = [0, 1, 2, 3]

    global = inject(GlobalService)
    input = inject(InputModalService)
    confirm = inject(ConfirmationService)
    params = inject(ParamService)
    route = inject(ActivatedRoute)
    #listener = inject(BaseWidgetListener)
    #activityService = inject(ActivityService)

    mWidgets = WidgetFactory.availableWidgets()

    ngOnInit() {
        this.global.init.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
            this.#listener.updated.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((args) => this.onWidgetOptionsChanged(...args))
            this.#listener.deleted.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((args) => this.onWidgetDelete(...args))
            this.route.params.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(_ => {
                if ('dashboard' in _) {
                    this.currentDashboard = parseInt(_['dashboard'])
                }
                else {
                    this.currentDashboard = 0
                }
                NxGlobal.setTitle(this.global.dashboards[this.currentDashboard]?.title)
            })
            this.addReloadListeners()

            // Switch to history tab when dashboard loads
            this.#activityService.switchToTabByComponent(TabAttentionComponent)
        })
    }

    addReloadListeners() {
        // this.global.dashboards.forEach((board:Dictionary) => {
        //     board.cols.forEach((col:Dictionary[]) => {
        //         col.forEach((widget:any) => {
        //             if (!('onReload' in widget)) {
        //                 widget.onReload = new EventEmitter()
        //             }
        //         })
        //     })
        // })
    }


    drop(event: CdkDragDrop<any[]>) {
        if (event.previousContainer === event.container) {
            moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
        } else {
            // Check if dragging from widget-list (activity tab)
            if (event.previousContainer.id === 'widget-list') {
                const widget = event.previousContainer.data[event.previousIndex];
                event.container.data.splice(event.currentIndex, 0, { widget: widget.key!, options: {} });
            } else {
                transferArrayItem(
                    event.previousContainer.data,
                    event.container.data,
                    event.previousIndex,
                    event.currentIndex,
                );
            }
        }
        this.updateDashboards()
    }

    toggleEditing = () => {
        this.is_editing = !this.is_editing
        NxGlobal.setDashboardEditMode(this.is_editing)
    }

    onNewDashboard = () => this.input.open('Title', false).then(_ => {
        this.global.dashboards.push({ title: _?.text, cols: [[], [], [], []] })
        this.updateDashboards()
    }).catch()

    onDashboadDelete = (pos: number) => this.confirm.confirm({ title: 'Delete', message: 'Do you really want to delete this dashboard?' }).then(() => {
        this.global.dashboards.splice(pos, 1)
        this.updateDashboards()
    }).catch()

    onWidgetDelete = ($event: any, col: number, pos: number) =>
        this.confirm.confirm({ title: 'Delete', message: 'Do you really want to delete this widget?' }).then(() => {
        this.global.dashboards[this.currentDashboard].cols[col].splice(pos, 1)
        this.updateDashboards()
    }).catch()

    onAddWidget = (w: TWidget, col: number) => {
        this.global.dashboards[this.currentDashboard].cols[col].push({ widget: w.key!, options: {} })
        this.updateDashboards()
    }

    onWidgetOptionsChanged = ($event: any, col: number, pos: number) => {
        this.global.dashboards[this.currentDashboard].cols[col][pos].options = $event
        //this.global.dashboards[this.currentDashboard].cols[col][pos].onReload.next()
        this.updateDashboards()
    }

    availableWidgets = WidgetFactory.availableWidgets
    componentFor = WidgetFactory.componentFor
    hasAccess = WidgetFactory.hasWidgetAccess

    updateDashboards = () => {
        this.addReloadListeners()
        this.global.user?.updateParam('DASHBOARDS', { value: JSON.stringify(this.global.dashboards) }).pipe(takeUntilDestroyed(this.#destroyRef)).subscribe()
    }
}
