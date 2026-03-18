import { CommonModule } from '@angular/common';
import { Component, inject, Input } from '@angular/core';
import { GlobalService } from 'src/models/global.service';
import { User } from 'src/models/user/user.model';

@Component({
    selector: 'hr-working-time-per-week',
    templateUrl: './hr-working-time-per-week.component.html',
    styleUrls: ['./hr-working-time-per-week.component.scss'],
    standalone: true,
    imports: [CommonModule]
})
export class HrWorkingTimePerWeekComponent {
    @Input() user:User
    global = inject(GlobalService)
}
