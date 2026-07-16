import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgxDaterangepickerMd } from 'ngx-daterangepicker-material';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { StartEnd } from '@constants/constants';
import { DATESPAN_RANGE } from '@constants/dateSpanRange';
import { ProjectService } from '@models/project/project.service';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import { dayjs } from '@constants/dates';
import { Project } from '@models/project/project.model';
import { Nx } from '@app/nx/nx.directive';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { SpinnerComponent } from '@shards/spinner/spinner.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'projects-reporting',
    imports: [FormsModule, NgxDaterangepickerMd, AvatarComponent, NgbTooltipModule, Nx, AvatarComponent, EmptyStateComponent, SpinnerComponent],
    templateUrl: './projects-reporting.component.html',
})
export class ProjectsReportingComponent {
    #projectService = inject(ProjectService);

    dateRange?: StartEnd = new StartEnd({
        startDate: dayjs().subtract(30, 'days'),
        endDate: dayjs(),
    });

    ranges = DATESPAN_RANGE;
    reportData = signal<Project[]>([]);
    loading = signal(false);

    formatDate = (date: string): string => dayjs(date).format('DD.MM.YYYY HH:mm');

    isStateInRange(stateDate: string): boolean {
        if (!this.dateRange?.startDate || !this.dateRange?.endDate) return false;
        const stateMoment = dayjs(stateDate);
        return stateMoment.isSameOrAfter(this.dateRange.startDate, 'day') && stateMoment.isSameOrBefore(this.dateRange.endDate, 'day');
    }

    constructor() {
        this.loadReport();
    }

    onDateRangeChange() {
        // Only reload if not initial constructor load
        if (this.reportData().length > 0) {
            this.loadReport();
        }
    }

    loadReport() {
        if (!this.dateRange?.startDate || !this.dateRange?.endDate) return;

        this.loading.set(true);
        const params = {
            start_date: this.dateRange.startDate.format('YYYY-MM-DD'),
            end_date: this.dateRange.endDate.format('YYYY-MM-DD'),
        };

        this.#projectService.indexReporting(params).subscribe((data) => {
            this.reportData.set(data);
            this.loading.set(false);
        });
    }
}
