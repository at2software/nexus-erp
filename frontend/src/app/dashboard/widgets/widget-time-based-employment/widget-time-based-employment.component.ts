import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { BaseWidgetComponent } from '../base.widget.component';
import { WidgetService } from '@models/widget.service';
import { environment } from 'src/environments/environment';
import { WidgetsModule } from '../widgets.module';
import { DecimalPipe } from '@angular/common';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'widget-time-based-employment',
    templateUrl: './widget-time-based-employment.component.html',
    styleUrls: ['./widget-time-based-employment.component.scss', './../base.widget.component.scss'],
    standalone: true,
    imports: [WidgetsModule, DecimalPipe],
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
