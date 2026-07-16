import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { BaseWidgetComponent } from '../base.widget.component';
import { WIDGET_SHARED } from '../widgets.shared';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'widget-revenue-monthly',
    templateUrl: './widget-revenue-monthly.component.html',
    styleUrls: ['./../base.widget.component.scss'],
    imports: [...WIDGET_SHARED],
})
export class WidgetRevenueMonthlyComponent extends BaseWidgetComponent {
    data = signal<any>(null);
}
