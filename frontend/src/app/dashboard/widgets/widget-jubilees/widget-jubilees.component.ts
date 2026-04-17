import { Component, inject, OnInit } from '@angular/core';
import { BaseWidgetComponent } from '../base.widget.component';
import { WidgetService } from 'src/models/widget.service';
import moment from 'moment';
import { environment } from 'src/environments/environment';
import { WidgetsModule } from '../widgets.module';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'widget-jubilees.component',
    templateUrl: './widget-jubilees.component.html',
    styleUrls: ['./widget-jubilees.component.scss', './../base.widget.component.scss'],
    standalone: true,
    imports: [WidgetsModule, CommonModule]
})
export class WidgetJubileesComponent extends BaseWidgetComponent implements OnInit {

    defaultOptions = () => ({ })

    #widgetService = inject(WidgetService)
    jubilees:any[] = []
    env= environment

    reload(): void {
        this.#widgetService.indexJubilees().subscribe(data => {
            let jubilees:any[] = []
            data.forEach((d:any) => {
                d.next = moment(d.next)
                jubilees.push(d)
            })
            jubilees = jubilees.sort((a:any,b:any) => a.next - b.next)
            this.jubilees = jubilees
        })        
    }
    isToday = (_:any) => moment().isSame(_.next, 'day')
}
