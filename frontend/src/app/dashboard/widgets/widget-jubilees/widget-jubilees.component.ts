import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { BaseWidgetComponent } from '../base.widget.component';
import { WidgetService } from '@models/widget.service';
import { dayjs } from '@constants/dates';
import { environment } from 'src/environments/environment';
import { WIDGET_SHARED } from '../widgets.shared';
import { DatePipe } from '@angular/common';
import { JubileeEntry } from '@models/api-response';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'widget-jubilees.component',
    templateUrl: './widget-jubilees.component.html',
    styleUrls: ['./widget-jubilees.component.scss', './../base.widget.component.scss'],
    imports: [...WIDGET_SHARED, DatePipe],
})
export class WidgetJubileesComponent extends BaseWidgetComponent {
    #widgetService = inject(WidgetService);
    jubilees = signal<JubileeEntry[]>([]);
    readonly env = environment;

    defaultOptions = () => ({});

    reload(): void {
        this.#widgetService.indexJubilees().subscribe((data) => {
            this.jubilees.set(
                data.map(d => ({ ...d, next: dayjs(d.next) }))
                    .sort((a, b) => a.next.valueOf() - b.next.valueOf())
            );
        });
    }

    isToday = (_: JubileeEntry) => dayjs().isSame(_.next, 'day');
}
