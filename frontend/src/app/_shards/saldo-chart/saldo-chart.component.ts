import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MoneyPipe } from '@pipes/money.pipe';

@Component({
    selector: 'saldo-chart',
    templateUrl: './saldo-chart.component.html',
    styleUrls: ['./saldo-chart.component.scss'],
    imports: [MoneyPipe, DecimalPipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaldoChartComponent {
    min = input<number>();
    max = input<number>();
    dx = input<number>();
    delta = input<number>();
    unit = input<'money' | 'hours'>('money');
}
