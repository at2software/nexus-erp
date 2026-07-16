import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BaseWidgetComponent } from '../base.widget.component';
import { StatsService } from '@models/stats-service';
import { User } from '@models/user/user.model';
import { WIDGET_SHARED } from '../widgets.shared';
import { DatePipe } from '@angular/common';
import { timer } from 'rxjs';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'widget-hr-team',
    templateUrl: './widget-hr-team.component.html',
    styleUrls: ['./../base.widget.component.scss'],
    imports: [...WIDGET_SHARED, DatePipe],
})
export class WidgetHrTeamComponent extends BaseWidgetComponent {
    #stats = inject(StatsService);
    data = signal<User[]>([]);

    defaultOptions = () => ({});

    _timer = timer(60000, 60000).pipe(takeUntilDestroyed()).subscribe(() => this.reload());

    reload(): void {
        this.#stats.showTeamStatus().subscribe((data: User[]) => this.data.set(data));
    }
}
