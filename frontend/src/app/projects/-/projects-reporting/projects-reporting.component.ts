import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgxDaterangepickerMd } from 'ngx-daterangepicker-material';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { StartEnd } from '@constants/constants';
import { DATESPAN_RANGE } from '@constants/date/dateSpanRange';
import { ProjectService } from '@models/project/project.service';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import { dayjs } from '@constants/date/dates';
import { modelListResource } from '@models/http/model-resource';
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

    readonly dateRange = signal<StartEnd | undefined>(
        new StartEnd({
            startDate: dayjs().subtract(30, 'days'),
            endDate: dayjs(),
        }),
    );

    ranges = DATESPAN_RANGE;

    readonly #reportData = modelListResource(
        () => {
            const range = this.dateRange();
            if (!range?.startDate || !range?.endDate) return undefined;
            return { start_date: range.startDate.format('YYYY-MM-DD'), end_date: range.endDate.format('YYYY-MM-DD') };
        },
        (params) => this.#projectService.indexReporting(params),
    );
    readonly reportData = this.#reportData.value;
    readonly loading = this.#reportData.isLoading;

    formatDate = (date: string): string => dayjs(date).format('DD.MM.YYYY HH:mm');

    isStateInRange(stateDate: string): boolean {
        const range = this.dateRange();
        if (!range?.startDate || !range?.endDate) return false;
        const stateMoment = dayjs(stateDate);
        return stateMoment.isSameOrAfter(range.startDate, 'day') && stateMoment.isSameOrBefore(range.endDate, 'day');
    }
}
