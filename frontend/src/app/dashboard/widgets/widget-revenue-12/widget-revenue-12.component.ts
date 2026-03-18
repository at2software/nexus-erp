import { Component, ViewChild } from '@angular/core';
import { BaseWidgetComponent } from '../base.widget.component';
import { WidgetsModule } from '../widgets.module';
import { ShortPipe } from 'src/pipes/short.pipe';
import { PermissionsDirective } from '@directives/permissions.directive';
import { LineChartRangeComponent } from 'src/app/_charts/chart-card-base/chart-card-range.component';

@Component({
    selector: 'widget-revenue-12',
    templateUrl: './widget-revenue-12.component.html',
    styleUrls: ['./widget-revenue-12.component.scss', './../base.widget.component.scss'],
    standalone: true,
    imports: [WidgetsModule, ShortPipe, PermissionsDirective]
})
export class WidgetRevenue12Component extends BaseWidgetComponent {
    @ViewChild(LineChartRangeComponent) chart!: LineChartRangeComponent
}
