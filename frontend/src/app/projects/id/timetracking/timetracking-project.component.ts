import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ProjectDetailGuard } from '@app/projects/project-details.guard';
import { TimetrackingComponent } from './timetracking.component';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import { DatePipe, DecimalPipe } from '@angular/common';
import { CdkTableModule } from '@angular/cdk/table';
import { NComponent } from '@shards/n/n.component';
import { ContinuousMarkerComponent } from '@shards/continuous/continuous.marker.component';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { Nx } from '@app/nx/nx.directive';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { EnableTableExportDirective } from '@app/app/table-controls/enable-table-export.directive';
import { FormsModule } from '@angular/forms';
import { NgxDaterangepickerMd } from 'ngx-daterangepicker-material';
import { SafePipe } from '@pipes/safe.pipe';
import { IssuePickerComponent } from '@shards/issue-picker/issue-picker.component';
import { StackedTableDirective } from '@directives/stacked-table.directive';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './timetracking.component.html',
    imports: [StackedTableDirective, AvatarComponent, CdkTableModule, DatePipe, DecimalPipe, NComponent, ContinuousMarkerComponent, EmptyStateComponent, EnableTableExportDirective, Nx, NgbTooltipModule, FormsModule, NgxDaterangepickerMd, SafePipe, IssuePickerComponent],
    host: { id: 'TimetrackingProjectComponent' },
})
export class TimetrackingProjectComponent extends TimetrackingComponent {
    parent = inject(ProjectDetailGuard);
}
