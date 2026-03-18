import { CdkTableModule } from '@angular/cdk/table';
import { CommonModule, DatePipe } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnChanges, Output, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EnableTableExportDirective } from '@app/app/table-controls/enable-table-export.directive';
import { Nx } from '@app/nx/nx.directive';
import { NgbCalendar, NgbDateAdapter, NgbDateNativeUTCAdapter, NgbDatepickerModule, NgbDateStruct, NgbInputDatepicker, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import { ProjectComponent } from '@shards/project/project.component';
import { TableSearchSortBase } from '@app/app/table-controls/table-base/table-search-sort-base.component';
import { SortData } from '@app/app/table-controls/sort-data';
import { SortMode } from '@app/app/table-controls/sort-mode';
import { GlobalService } from '@models/global.service';
import { Project } from '@models/project/project.model';
import { MoneyPipe } from '../../../../pipes/money.pipe';

@Component({
    standalone: true,
    imports: [
        CommonModule,
        Nx,
        DatePipe,
        ProjectComponent,
        CdkTableModule,
        EnableTableExportDirective,
        NgbTooltipModule,
        NgbDatepickerModule,
        FormsModule,
        MoneyPipe,
        AvatarComponent,
    ],
    selector: 'projects-table',
    templateUrl: './projects-table.component.html',
    styleUrls: ['./projects-table.component.scss'],
    providers: [{ provide: NgbDateAdapter, useClass: NgbDateNativeUTCAdapter }],
})
export class ProjectsTableComponent extends TableSearchSortBase<Project> implements OnChanges, OnInit {

    protected getItems(): Project[] {
        return this.projects;
    }
    @Input() projects: Project[]
    @Output() sortingChanged = new EventEmitter<SortData>()

	model: NgbDateStruct;

    sum: number = 0
    global = inject(GlobalService)
    displayedColumns = ['icons', 'createdAt', 'companyIcon', 'name', 'assignees']
    #calendar = inject(NgbCalendar)

    ngOnInit() {
        this.model = this.#calendar.getToday()
        if (this.global.user?.hasRole('invoicing')) {
            this.displayedColumns.push('net')
        }
        this.displayedColumns.push('dueAt')
    }

    updateSum() {
        let s = 0
        this.projects?.forEach((e: Project) => s += e.net);
        this.sum = s
    }
    ngOnChanges() {
        this.refreshItems()
        this.updateSum()
    }
    clearClicked(d:NgbInputDatepicker, x:Project) {
        d.close()
        x.due_at = undefined
        x.update()
    }
    projectState = (_:Project) => _

    sortByColumn(column: string): void {
        if (this.sortData.key === column) {
            this.sortData.sortMode = this.sortData.sortMode === SortMode.ASCENDING
                ? SortMode.DESCENDING
                : this.sortData.sortMode === SortMode.DESCENDING
                    ? SortMode.NONE
                    : SortMode.ASCENDING;
        } else {
            this.sortData.key = column;
            this.sortData.sortMode = SortMode.ASCENDING;
        }
        this.sortingChanged.emit(this.sortData);
    }

    getSortIcon = (column: string): string =>
        this.sortData.key !== column ? '' :
        this.sortData.sortMode === SortMode.ASCENDING ? '↑' :
        this.sortData.sortMode === SortMode.DESCENDING ? '↓' : '';

    override sortBy(sortData: SortData): void {
        this.sortData = sortData
        this.sortingChanged.emit(sortData)
    }

    override refreshItems(): void {
        this.sortedItems = this.projects
    }

}
