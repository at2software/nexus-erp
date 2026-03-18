import { Component, inject, OnInit } from '@angular/core';
import { BaseWidgetComponent } from '../base.widget.component';
import { WidgetService } from 'src/models/widget.service';
import { environment } from 'src/environments/environment';
import { WidgetsModule } from '../widgets.module';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'widget-time-based-employment',
    templateUrl: './widget-time-based-employment.component.html',
    styleUrls: ['./widget-time-based-employment.component.scss', './../base.widget.component.scss'],
    standalone: true,
    imports: [WidgetsModule, CommonModule]
})
export class WidgetTimeBasedEmploymentComponent extends BaseWidgetComponent implements OnInit {
    defaultOptions = () => ({ })
    
    #widgetService = inject(WidgetService)
    employees:any[] = []
    env = environment

    ngOnInit() {
        this.reload()
    }
    reload(): void {
        this.#widgetService.indexTimeBasedEmployees().subscribe(_ => this.employees = _)        
    }
}
