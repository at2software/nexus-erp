import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MoneyPipe } from 'src/pipes/money.pipe';

@Component({
    selector: 'saldo-chart',
    templateUrl: './saldo-chart.component.html',
    styleUrls: ['./saldo-chart.component.scss'],
    standalone: true,
    imports: [MoneyPipe, CommonModule]
})
export class SaldoChartComponent {
    @Input() min:number
    @Input() max:number
    @Input() dx:number
    @Input() delta:number
    @Input() unit:string = 'money' // 'money' or 'hours'
}
