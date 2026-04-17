import { Component, inject, OnInit } from '@angular/core';
import { BaseWidgetComponent } from '../base.widget.component';
import { StatsService } from 'src/models/stats-service';
import { WidgetsModule } from '../widgets.module';


@Component({
    selector: 'widget-revenue-monthly',
    templateUrl: './widget-revenue-monthly.component.html',
    styleUrls: ['./widget-revenue-monthly.component.scss', './../base.widget.component.scss'],
    standalone: true,
        imports: [WidgetsModule]
})
export class WidgetRevenueMonthlyComponent extends BaseWidgetComponent implements OnInit {
    stats = inject(StatsService)
    data: any
}
