import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { BaseWidgetComponent } from '../base.widget.component';
import { WidgetService } from '@models/widget.service';
import { environment } from 'src/environments/environment';
import { WIDGET_SHARED } from '../widgets.shared';
import { DecimalPipe } from '@angular/common';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'widget-time-based-employment',
    templateUrl: './widget-time-based-employment.component.html',
    styleUrls: ['./../base.widget.component.scss'],
    imports: [...WIDGET_SHARED, DecimalPipe],
})
export class WidgetTimeBasedEmploymentComponent extends BaseWidgetComponent {
    #widgetService = inject(WidgetService);
    employees = signal<any[]>([]);
    readonly env = environment;

    defaultOptions = () => ({});

    reload(): void {
        this.#widgetService.indexTimeBasedEmployees().subscribe((_) => this.employees.set(_));
    }
}
