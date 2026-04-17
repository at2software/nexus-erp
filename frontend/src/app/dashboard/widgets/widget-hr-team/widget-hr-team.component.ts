import { Component, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BaseWidgetComponent } from '../base.widget.component';
import { StatsService } from 'src/models/stats-service';
import { User } from 'src/models/user/user.model';
import { WidgetsModule } from '../widgets.module';
import { ShortPipe } from 'src/pipes/short.pipe';
import { CommonModule } from '@angular/common';
import { timer } from 'rxjs';

@Component({
    selector: 'widget-hr-team',
    templateUrl: './widget-hr-team.component.html',
    styleUrls: ['./widget-hr-team.component.scss', './../base.widget.component.scss'],
    standalone: true,
    imports: [WidgetsModule, ShortPipe, CommonModule]
})
export class WidgetHrTeamComponent extends BaseWidgetComponent implements OnInit {

    defaultOptions = () => ({})

    stats = inject(StatsService)
    data: User[] = []

    constructor() {
        super()
        timer(0, 60000).pipe(takeUntilDestroyed()).subscribe(() => this.reload())
    }

    reload(): void {
        this.stats.showTeamStatus().subscribe((data: User[]) => {
            this.data = data
        })
    }
}
