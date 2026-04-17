import { CdkTableModule } from '@angular/cdk/table';
import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, output, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EnableTableExportDirective } from '@app/app/table-controls/enable-table-export.directive';
import { Nx } from '@app/nx/nx.directive';
import { NgbDateAdapter, NgbDateNativeUTCAdapter, NgbDatepickerModule, NgbInputDatepicker, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
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
        DatePipe,
        Nx,
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
export class ProjectsTableComponent extends TableSearchSortBase<Project> {

    projects = input.required<Project[]>()
    sortingChanged = output<SortData>()

    global = inject(GlobalService)

    sum = computed(() => this.projects().reduce((s, e) => s + (e.net ?? 0), 0))

    displayedColumns = computed(() => {
        const cols = ['icons', 'createdAt', 'companyIcon', 'name', 'assignees']
        if (this.global.user?.hasRole('invoicing')) cols.push('net')
        cols.push('dueAt')
        return cols
    })

    constructor() {
        super()
        effect(() => {
            this.projects()
            untracked(() => this.refreshItems())
        })
    }

    protected getItems(): Project[] {
        return this.projects()
    }

    override refreshItems(): void {
        this.sortedItems = this.projects()
    }

    clearClicked(d: NgbInputDatepicker, x: Project) {
        d.close()
        x.due_at = undefined
        x.update()
    }

    sortByColumn(column: string): void {
        if (this.sortData.key === column) {
            this.sortData.sortMode =
                this.sortData.sortMode === SortMode.ASCENDING ? SortMode.DESCENDING :
                this.sortData.sortMode === SortMode.DESCENDING ? SortMode.NONE :
                SortMode.ASCENDING
        } else {
            this.sortData.key = column
            this.sortData.sortMode = SortMode.ASCENDING
        }
        this.sortingChanged.emit(this.sortData)
    }

    getSortIcon = (column: string): string =>
        this.sortData.key !== column ? '' :
        this.sortData.sortMode === SortMode.ASCENDING ? '↑' :
        this.sortData.sortMode === SortMode.DESCENDING ? '↓' : ''

    override sortBy(sortData: SortData): void {
        this.sortData = sortData
        this.sortingChanged.emit(sortData)
    }
}
