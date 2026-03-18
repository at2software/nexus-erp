import { Component } from '@angular/core';
import { LineChartParamComponent } from './chart-card-base.component';
import { Color } from 'src/constants/Color';
import { NgxEchartsDirective } from 'ngx-echarts';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'chart-card-line',
    templateUrl: './chart-card-base.component.html',
    styleUrls: ['./chart-card-base.component.scss'],
    standalone: true,
    imports: [NgxEchartsDirective, CommonModule]
})
export class ChartCardLineComponent extends LineChartParamComponent {
    individualOptions = () => ({
        chart: { type: 'line', height:75 },
        fill: { opacity: 1 },
        stroke: { width: 2, opacity: 1 }
    })
    updateSeries(result: any[]): void {
        this.value = result.reduce((a, b: any) => a + b['current'], 0)
        let series: any[] = []
        // Area
        let maxVals = 0
        series = series.concat(result.map((_: any, i: number) => {
            _['data'] = _['data'].map((_: any) => {
                maxVals = Math.max(maxVals, _.max)
                return { x: _.x, y: [_.min, _.max] }
            })
            const col = Color.fromVar(this.getColor(i)).lighten(i * 20)
            _['color'] = col.toHexString()
            return _
        }))
        this.chartOptions.series = series
    }
}
