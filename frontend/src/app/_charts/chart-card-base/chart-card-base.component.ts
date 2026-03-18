import { Component, Input, OnChanges, ViewChild, inject, OnInit } from '@angular/core';
import { EChartsSimpleOptions } from '../ChartOptions';
import { NgxEchartsDirective } from 'ngx-echarts';
import { deepMerge } from 'src/constants/deepMerge';
import { deepCopy } from 'src/constants/deepClone';
import { GlobalService } from 'src/models/global.service';

import { Color } from 'src/constants/Color';
import { ParamService } from '@models/param.service';
import moment from 'moment';

@Component({
    selector: 'line-chart',
    templateUrl: './chart-card-base.component.html',
    styleUrls: ['./chart-card-base.component.scss'],
    standalone: true,
    imports: [NgxEchartsDirective]
})
export class LineChartComponent implements OnInit, OnChanges {
    chartOptions: any = {}
    echartsInstance: any
    trend:number = 0
    
    @Input() value: any = 0
    @Input() cardTitle: string = ""
    @Input() color: string|string[] = "primary"
    @Input() options: any = {}
    @Input() suffix:string = ''
    @Input() roles?:string

    global = inject(GlobalService)
    
    @ViewChild(NgxEchartsDirective, { static: false }) chart: NgxEchartsDirective
    
    individualOptions = ():object => ({})

    ngOnInit():void {
        this.chartOptions = deepMerge(deepCopy(EChartsSimpleOptions), {
            series: [],
            tooltip: {
                confine: true,
                formatter: (params: any) => {
                    if (!params || params.length === 0) return '';
                    
                    const xValue = params[0].axisValue;
                    const headerColor = Color.fromVar(this.getColor(0)).toHexString();
                    const headerTextColor = (new Color(headerColor)).bestBW().toHexString();
                    
                    // Header with date
                    let html = `<div class="card-header text-center" style="background-color: ${headerColor}; color: ${headerTextColor}; padding: 4px;">`;
                    html += `${xValue}</div>`;
                    
                    let total = 0;
                    html += '<div class="card-body p-1">';
                    params.forEach((param: any, i: number) => {
                        const seriesColor = param.color || this.getColor(i);
                        html += `<div class="f-b p-0 d-flex" style="color: ${seriesColor};">`;
                        html += `<div class="flex-fill px-2">${param.seriesName}</div>`;
                        html += `<div class="px-2 text-end">${param.value}${this.suffix}</div></div>`;
                        total += param.value || 0;
                    });
                    html += `<div class="f-b p-0 d-flex"><div class="flex-fill px-2">&sum;</div><div class="px-2 text-end">${total}${this.suffix}</div></div>`;
                    html += '</div>';
                    return `<div class="arrow_box">${html}</div>`;
                }
            },
            xAxis: {
                type: 'time',
                show: false
            },
            yAxis: {
                type: 'value',
                show: false,
                min: 0
            }
        }, this.individualOptions(), this.options)
    }
    ngOnChanges(changes: any): void {
        if (this.chartOptions && 'options' in changes && changes.options) {
            this.chartOptions = Object.assign(this.chartOptions, changes.options) 
            window.dispatchEvent(new Event('resize'))
        }
    }
    onChartInit(ec: any) {
        this.echartsInstance = ec;
    }

    colorArray = ():string[] => Array.isArray(this.color) ? this.color : [this.color]
    getColor = (index:number) => this.colorArray()[index % this.colorArray().length]
}

@Component({
    template: '',
    standalone: true
})
export abstract class LineChartParamComponent extends LineChartComponent implements OnChanges, OnInit {
    @Input() keyPath: string | undefined = undefined
    @Input() chartData: any = undefined
    @Input() type:string = 'bar'
    @Input() cluster:string = 'month'
    @Input() offset:'none'|'month'|'year' = 'none'

    abstract updateSeries(result:any[]):void
    #paramService = inject(ParamService)


    ngOnInit():void {
        super.ngOnInit()
        this.reload()
    }
    ngOnChanges(changes: any): void {
        super.ngOnChanges(changes)
        if ('keyPath' in changes || 'chartData' in changes) {
            this.reload()
        }
    }

    seriesLength = () => this.keyPath?.split(',').length ?? 0

    reload() {
        // Check roles field
        if (this.roles) {
            const requiredRoles = this.roles.split('|')
            if (!this.global.user?.hasAnyRole(requiredRoles)) {
                return
            }
        }
        // If chartData is provided, use it directly instead of fetching
        if (this.chartData) {
            // Ensure chartData is an array (wrap single series in array)
            const dataArray = Array.isArray(this.chartData) ? this.chartData : [this.chartData]
            return this.updateSeries(dataArray)
        }
        // Otherwise, fetch data using keyPath (legacy behavior)
        if (this.keyPath) {
            this.chartOptions.series = []
            if (this.echartsInstance) {
                this.echartsInstance.clear()
            }
            const start = moment().startOf('month').subtract(36, "month")
            this.#paramService.history(this.keyPath, start.unix(), 'month').subscribe((_) => this.updateSeries(_))
        }
    }
}
