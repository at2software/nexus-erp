
import { Component, inject, OnInit } from '@angular/core';
import { ApxChartXComponent } from '@charts/apx-chart-x/apx-chart-x.component';
import { SankeyChartComponent, SankeyData } from '@charts/sankey-chart/sankey-chart.component';
import { RevenueSpiralChartComponent, MonthlyRevenue } from '@charts/revenue-spiral-chart/revenue-spiral-chart.component';
import { ChartOptionsMinimal, ChartOptionsSparkline, annotate } from '@charts/ChartOptions';
import { Color } from '@constants/Color';
import { deepCopy } from '@constants/deepClone';
import { deepMerge } from '@constants/deepMerge';
import { WidgetCashflowComponent } from '@dashboard/widgets/widget-cashflow/widget-cashflow.component';
import { WidgetRevenueCurrentYearComponent } from '@dashboard/widgets/widget-revenue-current-year/widget-revenue-current-year.component';
import { WidgetRevenueRadialComponent } from '@dashboard/widgets/widget-revenue-radial/widget-revenue-radial.component';
import { StatsService } from '@models/stats-service';
import { InvoiceService } from '@models/invoice/invoice.service';
import { MarketingService } from '@models/marketing/marketing.service';
import { MoneyPipe } from 'src/pipes/money.pipe';
import { ShortPipe } from 'src/pipes/short.pipe';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'invoices-stats',
    templateUrl: './invoices-stats.component.html',
    styleUrls: ['./invoices-stats.component.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, NgbTooltipModule, WidgetCashflowComponent, WidgetRevenueCurrentYearComponent, WidgetRevenueRadialComponent, ApxChartXComponent, SankeyChartComponent, RevenueSpiralChartComponent]
})
export class InvoicesStatsComponent implements OnInit {

    overallChart:any
    funnelMode: 'count' | 'money' = 'count';
    funnelData?: SankeyData;
    spiralRevenueData?: MonthlyRevenue[];
    spiralSmoothing: number = 3;
    service = inject(StatsService)
    invoiceService = inject(InvoiceService)
    marketingService = inject(MarketingService)
    shortPipe = new ShortPipe
    moneyPipe = new MoneyPipe

    ngOnInit() {
        this.reloadInvoiceOverall()
        this.reloadInvoiceFunnel()
        this.reloadSpiralRevenue()
    }

    toggleFunnelMode() {
        this.funnelMode = this.funnelMode === 'count' ? 'money' : 'count';
    }

    reloadInvoiceFunnel() {
        this.marketingService.getFunnel().subscribe((response: any) => {
            this.funnelData = response;
        });
    }

    reloadSpiralRevenue() {
        this.invoiceService.getMonthlySpiralRevenue().subscribe((data: any) => {
            this.spiralRevenueData = data as MonthlyRevenue[];
        });
    }
    reloadInvoiceOverall() {
        this.service.showInvoiceOverall().subscribe(response => {
            if (!response.current?.length) return
            const maxVal = Math.max(...response.current.map((_:any) => _.sum))
            this.overallChart = deepMerge(deepCopy(ChartOptionsMinimal), deepCopy(ChartOptionsSparkline), {
                chart: { height: 150, type: 'bar', redrawOnWindowResize: true },
                series: [
                    { name: 'current', color:Color.fromVar('primary').toHexString(), data: response.current.map((s:any) => ({ x: s.year, y: s.sum })), }
                ],
                tooltip: { shared: true, y: { formatter: this.moneyPipe.transform } },
                annotations: {
                    yaxis: [
                        annotate(maxVal, 0, this.shortPipe)
                    ]
                },
                xaxis: { type: 'datetime' },
            })
        })
    }
}
