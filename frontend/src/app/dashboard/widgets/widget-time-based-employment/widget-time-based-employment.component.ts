import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { BaseWidgetComponent } from '../base.widget.component';
import { WidgetService } from '@models/widget.service';
import { environment } from '@environments/environment';
import { WIDGET_SHARED } from '../widgets.shared';
import { DecimalPipe } from '@angular/common';
import { TimeBasedEmployeeDto } from '@models/_core/api-response';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'widget-time-based-employment',
    templateUrl: './widget-time-based-employment.component.html',
    styleUrls: ['./../base.widget.component.scss'],
    imports: [...WIDGET_SHARED, DecimalPipe],
})
export class WidgetTimeBasedEmploymentComponent extends BaseWidgetComponent {
    #widgetService = inject(WidgetService);
    readonly env = environment;

    defaultOptions = () => ({});

    readonly #employees = this.optionsResource(() => this.#widgetService.indexTimeBasedEmployees());
    readonly employees = computed<TimeBasedEmployeeDto[]>(() => this.#employees.value() ?? []);
}
