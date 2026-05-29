import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { BaseWidgetComponent } from '../base.widget.component';
import { WidgetsModule } from '../widgets.module';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'widget-revenue-monthly',
    templateUrl: './widget-revenue-monthly.component.html',
    styleUrls: ['./widget-revenue-monthly.component.scss', './../base.widget.component.scss'],
    standalone: true,
    imports: [WidgetsModule],
})
export class WidgetRevenueMonthlyComponent extends BaseWidgetComponent {
    data = signal<any>(null);
}
