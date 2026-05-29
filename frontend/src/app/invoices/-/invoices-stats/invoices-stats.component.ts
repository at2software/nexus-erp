import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { EchartsComponent } from '@charts/echarts-wrapper/echarts-wrapper.component';
import { SankeyChartComponent, SankeyData } from '@charts/sankey-chart/sankey-chart.component';
import { RevenueSpiralChartComponent, MonthlyRevenue } from '@charts/revenue-spiral-chart/revenue-spiral-chart.component';
import { ECHARTS_DEFAULT_TOOLTIP_OPTIONS } from '@charts/echarts-presets';
import { Color } from '@constants/Color';
import { WidgetCashflowComponent } from '@dashboard/widgets/widget-cashflow/widget-cashflow.component';
import { WidgetRevenueCurrentYearComponent } from '@dashboard/widgets/widget-revenue-current-year/widget-revenue-current-year.component';
import { WidgetRevenueRadialComponent } from '@dashboard/widgets/widget-revenue-radial/widget-revenue-radial.component';
import { StatsService } from '@models/stats-service';
import { InvoiceService } from '@models/invoice/invoice.service';
import { MarketingService } from '@models/marketing/marketing.service';
import { MoneyPipe } from '@pipes/money.pipe';
import { ShortPipe } from '@pipes/short.pipe';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'invoices-stats',
    templateUrl: './invoices-stats.component.html',
    styleUrls: ['./invoices-stats.component.scss'],
    standalone: true,
    imports: [FormsModule, NgbTooltipModule, WidgetCashflowComponent, WidgetRevenueCurrentYearComponent, WidgetRevenueRadialComponent, EchartsComponent, SankeyChartComponent, RevenueSpiralChartComponent],
})
export class InvoicesStatsComponent {
    overallChart = signal<any>(undefined);
    funnelMode = signal<'count' | 'money'>('count');
    funnelData = signal<SankeyData | undefined>(undefined);
    spiralRevenueData = signal<MonthlyRevenue[] | undefined>(undefined);
    spiralSmoothing = signal(3);

    #service = inject(StatsService);
    #invoiceService = inject(InvoiceService);
    #marketingService = inject(MarketingService);
    readonly #shortPipe = new ShortPipe();
    readonly #moneyPipe = new MoneyPipe();

    constructor() {
        this.#reloadInvoiceOverall();
        this.#reloadInvoiceFunnel();
        this.#reloadSpiralRevenue();
    }

    toggleFunnelMode = () => this.funnelMode.update((m) => (m === 'count' ? 'money' : 'count'));

    #reloadInvoiceFunnel() {
        this.#marketingService.getFunnel().subscribe((response: any) => this.funnelData.set(response));
    }

    #reloadSpiralRevenue() {
        this.#invoiceService.getMonthlySpiralRevenue().subscribe((data: any) => this.spiralRevenueData.set(data as MonthlyRevenue[]));
    }

    #reloadInvoiceOverall() {
        this.#service.showInvoiceOverall().subscribe((response) => {
            if (!response.current?.length) return;
            const maxVal = Math.max(...response.current.map((_: any) => _.sum));
            const primaryColor = Color.fromVar('primary').toHexString();
            this.overallChart.set({
                chart: { height: 150 },
                backgroundColor: 'transparent',
                animation: false,
                grid: { left: 0, right: 0, top: 10, bottom: 0, containLabel: false },
                xAxis: { type: 'time', show: false },
                yAxis: { type: 'value', show: false },
                tooltip: {
                    trigger: 'axis',
                    ...ECHARTS_DEFAULT_TOOLTIP_OPTIONS,
                    formatter: (params: any[]) => params.map((p: any) => `${new Date(p.value[0]).getFullYear()}: ${this.#moneyPipe.transform(p.value[1])}`).join('<br>'),
                },
                series: [
                    {
                        name: 'current',
                        type: 'bar',
                        data: response.current.map((s: any) => [s.year, s.sum]),
                        itemStyle: { color: primaryColor },
                        markLine: {
                            silent: true,
                            symbol: 'none',
                            data: [{ yAxis: maxVal, name: this.#shortPipe.transform(maxVal), lineStyle: { color: '#ffffff44', type: 'dashed', width: 1 }, label: { show: true, formatter: '{b}', position: 'insideEndTop', color: '#ffffff44', fontSize: 10 } }],
                        },
                    },
                ],
            });
        });
    }
}
