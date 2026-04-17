import { Component, input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxEchartsDirective } from 'ngx-echarts';
import { ActivityTabComponent } from '@app/_activity/activity-tab.component';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { AvatarComponent } from '@app/_shards/avatar/avatar.component';
import { User } from '@models/user/user.model';
import { TFocusDay } from '../hr-focus-table.component';

@Component({
    selector: 'hr-focus-summary-tab',
    templateUrl: './hr-focus-summary-tab.component.html',
    standalone: true,
    imports: [ActivityTabComponent, CommonModule, NgxEchartsDirective, ScrollbarComponent, AvatarComponent]
})
export class HrFocusSummaryTabComponent implements OnChanges {

    days = input<TFocusDay[]>()
    user = input.required<User>()

    dateFrom     = ''
    dateTo       = ''
    totalActual  = 0
    totalPaid     = 0
    totalUnpaid   = 0
    totalVacation = 0
    totalSick     = 0
    totalExpected = 0
    gap          = 0
    paidPercent  = 0
    donutOptions : any = null
    userKey      = 0

    ngOnChanges(changes: SimpleChanges) {
        if ('user' in changes) this.userKey++
        this.compute()
    }

    compute() {
        const days = this.days() ?? []
        if (!days.length || !this.user()) return

        const sorted = [...days].sort((a, b) => a.moment.diff(b.moment))
        this.dateFrom = sorted[0].date
        this.dateTo   = sorted[sorted.length - 1].date

        const hpwArray = this.user().getHpwArray() // [mo, tu, we, th, fr, sa, su]

        let paid = 0, unpaid = 0, expected = 0, vacation = 0, sick = 0
        for (const day of sorted) {
            for (const f of day.foci) {
                if (f.isUnpaid()) unpaid += f.duration
                else paid += f.duration
            }
            // Skip weekends from expected hours
            if (!day.weekend) {
                const contractedHours = hpwArray[day.moment.isoWeekday() - 1] ?? 0
                if (day.vacation?.isSick()) {
                    sick += contractedHours
                } else if (day.vacation?.isVacation()) {
                    vacation += contractedHours
                } else {
                    // Regular workday contributes to expected
                    expected += contractedHours
                }
            }
        }

        this.totalPaid     = paid
        this.totalUnpaid   = unpaid
        this.totalVacation = vacation
        this.totalSick     = sick
        this.totalActual   = paid + unpaid
        this.totalExpected = expected
        this.gap          = expected - this.totalActual
        this.paidPercent  = this.totalActual > 0 ? (paid / this.totalActual) * 100 : 0

        this.donutOptions = {
            backgroundColor: 'transparent',
            tooltip: { trigger: 'item', formatter: '{b}: {c}h ({d}%)' },
            series: [{
                type      : 'pie',
                radius    : ['52%', '75%'],
                avoidLabelOverlap: false,
                selectedMode: 'multiple',
                selectedOffset: 8,
                label     : {
                    show      : true,
                    position  : 'center',
                    color     : '#ccc',
                    fontSize  : 13,
                    formatter : () => `${this.totalActual.toFixed(1)}h\n/ ${expected.toFixed(1)}h`
                },
                emphasis  : { label: { fontSize: 14 } },
                data: [
                    { value: parseFloat(paid.toFixed(2)),     name: 'Paid',     itemStyle: { color: '#20c997' } },
                    { value: parseFloat(unpaid.toFixed(2)),   name: 'Unpaid',   itemStyle: { color: '#6c757d' } },
                    { value: parseFloat(vacation.toFixed(2)), name: 'Vacation', selected: vacation > 0, itemStyle: { color: '#0dcaf0' } },
                    { value: parseFloat(sick.toFixed(2)),     name: 'Sick',     selected: sick > 0,     itemStyle: { color: '#ffc107' } },
                    ...( this.gap > 0
                        ? [{ value: parseFloat(this.gap.toFixed(2)),        name: 'Gap',      selected: true, itemStyle: { color: '#dc3545' } }]
                        : this.gap < 0
                        ? [{ value: parseFloat((-this.gap).toFixed(2)),     name: 'Overtime', selected: true, itemStyle: { color: '#fd7e14' } }]
                        : []
                    )
                ]
            }]
        }
    }
}
