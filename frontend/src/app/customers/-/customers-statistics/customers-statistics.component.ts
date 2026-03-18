import { Component, inject, OnInit } from '@angular/core';
import { Company } from '@models/company/company.model';
import { InvoiceService } from '@models/invoice/invoice.service';
import { ChartOptionsMinimal, ChartOptionsPieLabels } from '@charts/ChartOptions';
import { Color } from '@constants/Color';
import { GlobalService } from '@models/global.service';
import { deepCopy } from '@constants/deepClone';
import moment from 'moment';
import { deepMerge } from '@constants/deepMerge';
import { CommonModule } from '@angular/common';
import { NexusModule } from '@app/nx/nexus.module';
import { ApxChartXComponent } from '@charts/apx-chart-x/apx-chart-x.component';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';

const BREAKPOINT_PERC = 0.025
const BREAKPOINT_REV = 1000
@Component({
    selector: 'customers-statistics',
    templateUrl: './customers-statistics.component.html',
    styleUrls: ['./customers-statistics.component.scss'],
    standalone: true,
    imports: [CommonModule, NexusModule, ApxChartXComponent, NgbTooltipModule, EmptyStateComponent]
})
export class CustomersStatisticsComponent implements OnInit {

    invoiceService = inject(InvoiceService)
    global = inject(GlobalService)
    pieOptions: any
    bcgOptions: any
    wageOptions: any
    premiumCustomers: Company[] | undefined = undefined

    convertToCompany(_: any) {
        const n = Company.fromJson(_)
        n.var.revenue_last_1_year = _.revenue_last_1_year
        n.var.revenue_total = parseFloat(_.revenue_total)
        n.var.log = Math.log10(Math.max(_.revenue_last_1_year, 1))
        n.var.customer_since = Math.max(moment().diff(_.earliest_invoice.created_at, 'year'), 1)
        n.var.trend = (_.revenue_last_1_year * n.var.customer_since / _.revenue_total) - 1
        return n
    }

    ngOnInit() {
        this.invoiceService.getCustomerStats().subscribe((data: any) => {
            const companies: Company[] = data.companies.map(this.convertToCompany)
            this.premiumCustomers = companies.filter(_ => _.var.revenue_last_1_year >= BREAKPOINT_PERC * data.total_last_year)
            const restCompanies = companies.filter(_ => _.var.revenue_last_1_year < BREAKPOINT_PERC * data.total_last_year)
            const revCompanies = companies.filter(_ => _.var.revenue_last_1_year > BREAKPOINT_REV)
            const reducedRestRevenue = restCompanies.reduce((a, b) => a + b.var.revenue_last_1_year, 0)
            const reduced = [
                ...this.premiumCustomers,
                ...(restCompanies.length ? [{
                    id: '0',
                    name: $localize`:@@i18n.common.rest:rest`,
                    var: { revenue_last_1_year: reducedRestRevenue }
                }] : [])
            ]

            this.pieOptions = deepMerge(deepCopy(ChartOptionsMinimal), {
                series: reduced.map(_ => _.var.revenue_last_1_year),
                chart: { type: 'donut', height: 300 },
                labels: reduced.map(_ => _.name),
                colors: reduced.map(_ => _.id !== '0' ? Color.uniqueColorFromString('' + _.id) : '#333333'),
                stroke: { colors: reduced.map(_ => '#000000') },
                tooltip: { y: { formatter: (val: number) => `${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ` + this.global.currencySymbol() } },
                plotOptions: { pie: ChartOptionsPieLabels }
            })

            const eur = (val:number) => val ? `${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ` + this.global.currencySymbol() : ''
            const dashAnnotation = (v:number|Promise<any>, col:string) => ({ y: v, borderColor: col, strokeDashArray: 2, borderWidth: 2 })

            this.wageOptions = this.getScatterplot(revCompanies, _=>_.var.log, _=> _.var.revenue_total / (_.total_time ?? 0), _=>_.var.revenue_total, 'hourly wage', {
                annotations: {
                    yaxis: [
                        dashAnnotation(this.global.setting('INVOICE_HOURLY_WAGE'), Color.fromVar('--bs-green', '').darken(5).toHexString()),
                        dashAnnotation(0.833 * this.global.setting('INVOICE_HOURLY_WAGE'), Color.fromVar('--bs-yellow', '').darken(5).toHexString()),
                        dashAnnotation(0.666 * this.global.setting('INVOICE_HOURLY_WAGE'), Color.fromVar('--bs-orange', '').darken(5).toHexString()),
                        dashAnnotation(0.5 * this.global.setting('INVOICE_HOURLY_WAGE'), Color.fromVar('--bs-red', '').darken(5).toHexString()),
                    ], 
                },        
                tooltip: {       
                    x: { formatter: (_: number, { seriesIndex, w }: any) => w.config.series[seriesIndex].data[0].name },          
                    z: { formatter:eur, title: 'total revenue:' },
                    y: { formatter: eur },
                }
            }, 262)

            this.bcgOptions = this.getScatterplot(revCompanies, _=>_.var.log, _=>_.var.trend, _=>_.var.revenue_total, 'trend', {     
                annotations: {
                    yaxis: [{
                        y: 0,
                        borderColor: Color.fromVar('--bs-primary', '').darken(5).toHexString(),
                        strokeDashArray: 2,
                        borderWidth: 2,
                    }], 
                },          
                tooltip: {          
                    x: { formatter: (_: number, { seriesIndex, w }: any) => w.config.series[seriesIndex].data[0].name },          
                    z: { title: 'revenue', formatter: eur },
                    y: { formatter: (val: number) => `${(val * 100).toFixed(2)}%` },
                }
            }, 500)
        })
    }
    getScatterplot(companies:Company[], fnX:(_:Company)=>number, fnY:(_:Company)=>number, fnZ:(_:Company)=>number, name:string, options:any={}, height:number = 300) {
        return deepMerge(deepCopy(ChartOptionsMinimal), {
            series: companies.map(_ => ({
                name: name,
                data: [{ name: _.name, x: fnX(_), y: fnY(_), z: fnZ(_) }]
            })),
            annotations: {
                points: companies.map(_ => ({
                    x: fnX(_), y: fnY(_),
                    marker: { size: 0 },
                    image: {
                        path: _.icon,
                        width: 20,
                        height: 20,
                    }
                }))
            },
            markers: { strokeWidth: 1, strokeColors: '#666666' },
            plotOptions: { bubble: { minBubbleRadius: 11 } },
            chart: { type: 'bubble', height: height, zoom: { enabled: false }, toolbar: { show: false } },
            colors: companies.map(_ => Color.uniqueColorFromString('' + _.id)),
            tooltip: {
                theme: 'dark',
                shared: false,
                intersect: true,
            },
            xaxis: { show: false, labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false }}
        }, options)
    }
}
