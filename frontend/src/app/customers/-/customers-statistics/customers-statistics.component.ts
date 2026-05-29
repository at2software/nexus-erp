import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Company } from '@models/company/company.model';
import { InvoiceService } from '@models/invoice/invoice.service';
import { ECHARTS_DEFAULT_TOOLTIP_OPTIONS, ECHARTS_DONUT_ITEM_STYLE } from '@charts/echarts-presets';
import { Color } from '@constants/Color';
import { GlobalService } from '@models/global.service';
import moment from 'moment';
import { DecimalPipe, PercentPipe, DatePipe } from '@angular/common';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import { EchartsComponent } from '@charts/echarts-wrapper/echarts-wrapper.component';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { SpinnerComponent } from '@shards/spinner/spinner.component';

const BREAKPOINT_PERC = 0.025;
const BREAKPOINT_REV = 1000;
@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'customers-statistics',
    templateUrl: './customers-statistics.component.html',
    styleUrls: ['./customers-statistics.component.scss'],
    standalone: true,
    imports: [DecimalPipe, PercentPipe, DatePipe, AvatarComponent, EchartsComponent, NgbTooltipModule, EmptyStateComponent, SpinnerComponent],
})
export class CustomersStatisticsComponent implements OnInit {
    invoiceService = inject(InvoiceService);
    global = inject(GlobalService);
    pieOptions = signal<any>(undefined);
    bcgOptions = signal<any>(undefined);
    wageOptions = signal<any>(undefined);
    premiumCustomers = signal<Company[] | undefined>(undefined);
    isLoading = signal(true);

    convertToCompany(_: any) {
        const n = Company.fromJson(_);
        n.var.revenue_last_1_year = _.revenue_last_1_year;
        n.var.revenue_total = parseFloat(_.revenue_total);
        n.var.log = Math.log10(Math.max(_.revenue_last_1_year, 1));
        n.var.customer_since = Math.max(moment().diff(_.earliest_invoice.created_at, 'year'), 1);
        n.var.trend = (_.revenue_last_1_year * n.var.customer_since) / _.revenue_total - 1;
        return n;
    }

    ngOnInit() {
        this.isLoading.set(true);
        this.invoiceService.getCustomerStats().subscribe(async (data: any) => {
            this.isLoading.set(false);
            const rawCompanies = Array.isArray(data?.companies) ? data.companies : [];
            const totalLastYear = Number(data?.total_last_year ?? 0);

            const companies: Company[] = rawCompanies.map(this.convertToCompany);
            const premiumCustomers = companies.filter((_) => _.var.revenue_last_1_year >= BREAKPOINT_PERC * totalLastYear);
            this.premiumCustomers.set(premiumCustomers);
            const restCompanies = companies.filter((_) => _.var.revenue_last_1_year < BREAKPOINT_PERC * totalLastYear);
            const revCompanies = companies.filter((_) => _.var.revenue_last_1_year > BREAKPOINT_REV);
            const reducedRestRevenue = restCompanies.reduce((a, b) => a + b.var.revenue_last_1_year, 0);
            const reduced = [
                ...premiumCustomers,
                ...(restCompanies.length
                    ? [
                          {
                              id: '0',
                              getName: () => $localize`:@@i18n.common.rest:rest`,
                              var: { revenue_last_1_year: reducedRestRevenue },
                          },
                      ]
                    : []),
            ];

            const eur = (val: number) => (val ? `${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ` + this.global.currencySymbol() : '');
            const total = reduced.reduce((s, c) => s + (c.var?.revenue_last_1_year ?? 0), 0);

            this.pieOptions.set({
                chart: { height: 300 },
                backgroundColor: 'transparent',
                animation: false,
                tooltip: {
                    trigger: 'item',
                    ...ECHARTS_DEFAULT_TOOLTIP_OPTIONS,
                    formatter: (params: any) => `${params.name}: ${eur(params.value)}`,
                },
                graphic: [{ type: 'text', left: 'center', top: 'center', style: { text: eur(total), fill: '#fff', fontSize: 12 } }],
                series: [
                    {
                        type: 'pie',
                        radius: ['40%', '70%'],
                        data: reduced.map((_) => ({
                            value: _.var.revenue_last_1_year,
                            name: _.getName(),
                            itemStyle: { color: _.id !== '0' ? Color.uniqueColorFromString('' + _.id) : '#333333', ...ECHARTS_DONUT_ITEM_STYLE },
                        })),
                        label: { show: true, formatter: (p: any) => `${p.name}\n${p.percent?.toFixed(1)}%`, color: '#ffffff', fontSize: 11 },
                    },
                ],
            });

            const symbolMap = await this.#buildSymbolMap(revCompanies);
            const hourlyWage = this.global.setting('INVOICE_HOURLY_WAGE');
            const wageRed = 0.5 * hourlyWage;
            const bandRange = hourlyWage - wageRed;
            const wagePadding = (bandRange / 0.7) * 0.15;
            const yMin = wageRed - wagePadding;
            const yMax = hourlyWage + wagePadding;
            this.wageOptions.set(
                this.getScatterplot(
                    revCompanies,
                    (_) => _.var.log,
                    (_) => Math.min(yMax, Math.max(yMin, _.var.revenue_total / (_.total_time ?? 0))),
                    (_) => _.var.revenue_total,
                    'hourly wage',
                    {
                        yMin,
                        yMax,
                        yMarkLines: [
                            { yAxis: hourlyWage, color: Color.fromVar('--bs-green', '').darken(5).toHexString() },
                            { yAxis: 0.833 * hourlyWage, color: Color.fromVar('--bs-yellow', '').darken(5).toHexString() },
                            { yAxis: 0.666 * hourlyWage, color: Color.fromVar('--bs-orange', '').darken(5).toHexString() },
                            { yAxis: wageRed, color: Color.fromVar('--bs-red', '').darken(5).toHexString() },
                        ],
                        tooltipFormatter: (params: any) => `${params.seriesName}<br/>${eur(params.value[0])}<br/>wage: ${eur(params.value[1])}<br/>total: ${eur(params.value[2])}`,
                    },
                    262,
                    symbolMap,
                ),
            );

            this.bcgOptions.set(
                this.getScatterplot(
                    revCompanies,
                    (_) => _.var.log,
                    (_) => _.var.trend * 100 + 101,
                    (_) => _.var.revenue_total,
                    'trend',
                    {
                        yAxisType: 'log',
                        yMarkLines: [{ yAxis: 101, color: '#555555' }],
                        tooltipFormatter: (params: any) => `${params.seriesName}<br/>trend: ${(params.value[1] - 101).toFixed(2)}%<br/>revenue: ${eur(params.value[2])}`,
                    },
                    500,
                    symbolMap,
                ),
            );
        });
    }

    getScatterplot(companies: Company[], fnX: (_: Company) => number, fnY: (_: Company) => number, fnZ: (_: Company) => number, _name: string, options: any = {}, height: number = 300, symbolMap: Map<string, string> = new Map()) {
        return {
            chart: { height },
            backgroundColor: 'transparent',
            animation: false,
            grid: { left: 0, right: 0, top: 0, bottom: 0 },
            xAxis: { type: 'value', show: false, scale: true },
            yAxis: { type: options.yAxisType ?? 'value', show: false, ...(options.yAxisType === 'log' ? { logBase: Math.E } : {}), ...(options.yMin !== undefined ? { min: options.yMin } : {}), ...(options.yMax !== undefined ? { max: options.yMax } : {}) },
            tooltip: {
                trigger: 'item',
                ...ECHARTS_DEFAULT_TOOLTIP_OPTIONS,
                formatter: options.tooltipFormatter,
            },
            series: companies.map((c) => ({
                name: c.getName(),
                type: 'scatter',
                symbol: symbolMap.get(String(c.id)) ?? (c.icon ? `image://${c.icon}` : 'circle'),
                symbolSize: 24,
                data: [[fnX(c), fnY(c), fnZ(c)]],
                itemStyle: { color: Color.uniqueColorFromString('' + c.id), borderColor: '#666666', borderWidth: 1 },
                ...(options.yMarkLines?.length
                    ? {
                          markLine: {
                              silent: true,
                              symbol: 'none',
                              data: options.yMarkLines.map((m: any) => ({ yAxis: m.yAxis, lineStyle: { color: m.color, type: 'dashed', width: 2 }, label: { show: false } })),
                          },
                      }
                    : {}),
            })),
        };
    }

    async #buildSymbolMap(companies: Company[]): Promise<Map<string, string>> {
        const map = new Map<string, string>();
        await Promise.all(
            companies.filter((c) => !!c.icon).map(async (c) => {
                const symbol = await this.#toCircularSymbol(c.icon!);
                map.set(String(c.id), symbol);
            }),
        );
        return map;
    }

    #toCircularSymbol(url: string): Promise<string> {
        const size = 24;
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d')!;
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                ctx.beginPath();
                ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
                ctx.clip();
                ctx.drawImage(img, 0, 0, size, size);
                resolve(`image://${canvas.toDataURL()}`);
            };
            img.onerror = () => resolve('circle');
            img.src = url;
        });
    }
}
