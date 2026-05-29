import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { BaseWidgetComponent } from '../base.widget.component';
import { WidgetService } from '@models/widget.service';
import moment from 'moment';
import { environment } from 'src/environments/environment';
import { WidgetsModule } from '../widgets.module';
import { DatePipe } from '@angular/common';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'widget-jubilees.component',
    templateUrl: './widget-jubilees.component.html',
    styleUrls: ['./widget-jubilees.component.scss', './../base.widget.component.scss'],
    standalone: true,
    imports: [WidgetsModule, DatePipe],
})
export class WidgetJubileesComponent extends BaseWidgetComponent {
    #widgetService = inject(WidgetService);
    jubilees = signal<any[]>([]);
    readonly env = environment;

    defaultOptions = () => ({});

    reload(): void {
        this.#widgetService.indexJubilees().subscribe((data) => {
            this.jubilees.set(
                data.map((d: any) => ({ ...d, next: moment(d.next) })).sort((a: any, b: any) => a.next - b.next)
            );
        });
    }

    isToday = (_: any) => moment().isSame(_.next, 'day');
}
