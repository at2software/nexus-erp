import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { MoneyPipe } from 'src/pipes/money.pipe';

@Component({
    selector: 'saldo-chart',
    templateUrl: './saldo-chart.component.html',
    styleUrls: ['./saldo-chart.component.scss'],
    standalone: true,
    imports: [MoneyPipe, CommonModule]
})
export class SaldoChartComponent {
    min   = input<number>()
    max   = input<number>()
    dx    = input<number>()
    delta = input<number>()
    unit  = input<'money' | 'hours'>('money')
}
