import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { merge, switchMap, tap } from 'rxjs';
import { InputModalService } from '@app/_modals/modal-input/modal-input.component';
import { GlobalService } from '@models/global.service';
import { ConfirmationService } from '@app/_modals/modal-confirm/confirmation.service';
import { WidgetFactory } from '@dashboard/availableWidgets';
import { ActivatedRoute } from '@angular/router';
import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { NxGlobal } from '@app/nx/nx.global';
import { HeaderComponent } from '@app/app/header/header.component';
import { HeaderLinkItemComponent } from '@app/app/header/header-link-item/header-link-item.component';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { NgComponentOutlet } from '@angular/common';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { BaseWidgetListener } from './widgets/base.widget.listener';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { ActivityService } from '@app/_activity/activity.service';
import { TabAttentionComponent } from '@app/_activity/tab-attention/tab-attention.component';
import { GuidedTourComponent } from '@shards/guided-tour/guided-tour.component';
import { WidgetSuperadminWarningComponent } from './widgets/widget-superadmin-warning/widget-superadmin-warning.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss'],
    standalone: true,
    host: { '[class.is_editing]': 'is_editing()' },
    imports: [HeaderComponent, HeaderLinkItemComponent, ToolbarComponent, ScrollbarComponent, NgComponentOutlet, CdkDropList, EmptyStateComponent, NgbDropdownModule, CdkDrag, GuidedTourComponent, WidgetSuperadminWarningComponent],
})
export class DashboardComponent {
    is_editing = signal(false);
    currentDashboard = signal(0);

    global = inject(GlobalService);

    #input = inject(InputModalService);
    #confirm = inject(ConfirmationService);
    #route = inject(ActivatedRoute);
    #listener = inject(BaseWidgetListener);
    #activityService = inject(ActivityService);

    componentFor = WidgetFactory.componentFor;
    hasAccess = WidgetFactory.hasWidgetAccess;

    constructor() {
        this.global.init
            .pipe(
                takeUntilDestroyed(),
                switchMap(() => {
                    this.#activityService.switchToTabByComponent(TabAttentionComponent);
                    return merge(
                        this.#listener.updated.pipe(tap((args) => this.#onWidgetOptionsChanged(...args))),
                        this.#listener.deleted.pipe(tap((args) => this.#onWidgetDelete(...args))),
                        this.#route.params.pipe(
                            tap((_) => {
                                this.currentDashboard.set('dashboard' in _ ? parseInt(_['dashboard']) : 0);
                                NxGlobal.setTitle(this.global.dashboards[this.currentDashboard()]?.title);
                            }),
                        ),
                    );
                }),
            )
            .subscribe();
    }

    drop(event: CdkDragDrop<any[]>) {
        if (event.previousContainer === event.container) {
            moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
        } else if (event.previousContainer.id === 'widget-list') {
            const widget = event.previousContainer.data[event.previousIndex];
            event.container.data.splice(event.currentIndex, 0, { widget: widget.key!, options: {} });
        } else {
            transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
        }
        this.#updateDashboards();
    }

    toggleEditing = () => {
        this.is_editing.set(!this.is_editing());
        NxGlobal.setDashboardEditMode(this.is_editing());
    };

    onNewDashboard = () =>
        this.#input
            .open('Title', false)
            .then((_) => {
                this.global.dashboards.push({ title: _?.text, cols: [[], [], [], []] });
                this.#updateDashboards();
            })
            .catch();

    onDashboadDelete = (pos: number) =>
        this.#confirm
            .confirm({ title: $localize`:@@i18n.common.delete:Delete`, message: $localize`:@@i18n.dashboard.confirmDeleteDashboard:Do you really want to delete this dashboard?` })
            .then(() => {
                this.global.dashboards.splice(pos, 1);
                this.#updateDashboards();
            })
            .catch();

    #onWidgetDelete = (_: any, col: number, pos: number) =>
        this.#confirm
            .confirm({ title: $localize`:@@i18n.common.delete:Delete`, message: $localize`:@@i18n.dashboard.confirmDeleteWidget:Do you really want to delete this widget?` })
            .then(() => {
                this.global.dashboards[this.currentDashboard()].cols[col].splice(pos, 1);
                this.#updateDashboards();
            })
            .catch();

    #onWidgetOptionsChanged = ($event: any, col: number, pos: number) => {
        this.global.dashboards[this.currentDashboard()].cols[col][pos].options = $event;
        this.#updateDashboards();
    };

    #updateDashboards = () =>
        this.global.user?.updateParam('DASHBOARDS', { value: JSON.stringify(this.global.dashboards) }).subscribe();
}
