import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { BaseWidgetComponent } from '../base.widget.component';
import { StatsService } from 'src/models/stats-service';
import { User } from 'src/models/user/user.model';
import { WidgetsModule } from '../widgets.module';
import { ShortPipe } from 'src/pipes/short.pipe';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';

@Component({
    selector: 'widget-hr-team',
    templateUrl: './widget-hr-team.component.html',
    styleUrls: ['./widget-hr-team.component.scss', './../base.widget.component.scss'],
    standalone: true,
    imports: [WidgetsModule, ShortPipe, CommonModule]
})
export class WidgetHrTeamComponent extends BaseWidgetComponent implements OnInit, OnDestroy {

    #destroy$ = new Subject<void>()

    stats = inject(StatsService)
    data: any
    interval?:NodeJS.Timeout
    ngOnInit() {
        this.reload()
        this.interval = setInterval(() => this.reload, 60000)
    }
    ngOnDestroy() {
        if (this.interval) clearInterval(this.interval)
        this.#destroy$.next()
        this.#destroy$.complete()
    }
    defaultOptions = () => ({})
    reload(): void {
        this.stats.showTeamStatus().subscribe((data:User[]) => {
            this.data = data
        })
    }

}
