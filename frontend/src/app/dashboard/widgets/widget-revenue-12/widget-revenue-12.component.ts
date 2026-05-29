import { ChangeDetectionStrategy, Component, viewChild } from '@angular/core';
import { BaseWidgetComponent } from '../base.widget.component';
import { WidgetsModule } from '../widgets.module';
import { ShortPipe } from '@pipes/short.pipe';
import { PermissionsDirective } from '@directives/permissions.directive';
import { EchartsRangeCardComponent } from '@charts/echarts-card/echarts-range-card.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'widget-revenue-12',
    templateUrl: './widget-revenue-12.component.html',
    styleUrls: ['./widget-revenue-12.component.scss', './../base.widget.component.scss'],
    standalone: true,
    imports: [WidgetsModule, ShortPipe, PermissionsDirective],
})
export class WidgetRevenue12Component extends BaseWidgetComponent {
    readonly chart = viewChild(EchartsRangeCardComponent);
}
