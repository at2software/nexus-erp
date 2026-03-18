import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgxDaterangepickerMd } from 'ngx-daterangepicker-material';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { StartEnd } from '@constants/constants';
import { DATESPAN_RANGE } from '@constants/dateSpanRange';
import { ProjectService } from '@models/project/project.service';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import moment from 'moment';
import { Project } from '@models/project/project.model';
import { NexusModule } from '@app/nx/nexus.module';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';

@Component({
    selector: 'projects-reporting',
    standalone: true,
    imports: [FormsModule, NgxDaterangepickerMd, AvatarComponent, NgbTooltipModule, NexusModule, EmptyStateComponent],
    templateUrl: './projects-reporting.component.html',
    styleUrl: './projects-reporting.component.scss'
})
export class ProjectsReportingComponent implements OnInit {
    #projectService = inject(ProjectService);

    dateRange?: StartEnd = new StartEnd({
        startDate: moment().subtract(30, 'days'),
        endDate: moment()
    });

    ranges: any = DATESPAN_RANGE;
    reportData: Project[]
    loading = false;


    formatDate(date: any): string {
        return moment(date).format('DD.MM.YYYY HH:mm');
    }

    isStateInRange(stateDate: any): boolean {
        if (!this.dateRange?.startDate || !this.dateRange?.endDate) return false;
        const stateMoment = moment(stateDate);
        const startDate = moment((this.dateRange.startDate as any).$d || this.dateRange.startDate);
        const endDate = moment((this.dateRange.endDate as any).$d || this.dateRange.endDate);
        return stateMoment.isSameOrAfter(startDate, 'day') &&
               stateMoment.isSameOrBefore(endDate, 'day');
    }

    ngOnInit() {
        this.loadReport();
    }

    onDateRangeChange() {
        // Only reload if not initial load (ngOnInit already loads)
        if (this.reportData?.length > 0) {
            this.loadReport();
        }
    }

    loadReport() {
        if (!this.dateRange?.startDate || !this.dateRange?.endDate) return;

        this.loading = true;
        const params = {
            start_date: this.dateRange.startDate.format('YYYY-MM-DD'),
            end_date: this.dateRange.endDate.format('YYYY-MM-DD')
        };

        this.#projectService.indexReporting(params).subscribe(data => {
            this.reportData = data;
            this.loading = false;
        });
    }
}
