import { Component, ElementRef, ViewChild, AfterViewInit, inject } from '@angular/core';
import * as d3 from 'd3';
import { InvoiceService } from '@models/invoice/invoice.service';
import { NexusModule } from 'src/app/nx/nexus.module';
import { CommonModule } from '@angular/common';
import { Color } from '@constants/Color';
import { MoneyPipe } from 'src/pipes/money.pipe';

interface MonthlyRevenueData {
    month: number;
    min: number;
    q1: number;
    median: number;
    q3: number;
    max: number;
    avg: number;
}

@Component({
    selector: 'widget-revenue-radial',
    templateUrl: './widget-revenue-radial.component.html',
    styleUrls: ['./widget-revenue-radial.component.scss'],
    standalone: true,
    imports: [CommonModule, NexusModule],
    providers: [MoneyPipe]
})
export class WidgetRevenueRadialComponent implements AfterViewInit {
    @ViewChild('chart', { static: false }) chartContainer!: ElementRef;

    invoiceService = inject(InvoiceService);
    moneyPipe = inject(MoneyPipe);
    data: MonthlyRevenueData[] = [];
    loading = true;

    ngAfterViewInit() {
        this.loadData();
    }

    loadData() {
        this.invoiceService.getMonthlyRevenueRanges().subscribe((data: any) => {
            this.data = data as MonthlyRevenueData[];
            this.loading = false;
            setTimeout(() => this.createChart(), 0);
        });
    }

    createChart() {
        if (!this.chartContainer || !this.data.length) return;

        d3.select(this.chartContainer.nativeElement).selectAll('*').remove();

        const width = 280;
        const height = 280;
        const innerRadius = 50;
        const baseOuterRadius = Math.min(width, height) / 2 - 30;
        const labelRadius = baseOuterRadius + 20; // Keep labels at original position
        const outerRadius = baseOuterRadius * 1.4; // Increase chart diameter by 40%

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        const x = d3.scaleBand()
            .domain(d3.range(12).map(i => i.toString()))
            .range([0, 2 * Math.PI])
            .align(0);

        const maxValue = d3.max(this.data, d => d.max) || 1;
        const y = d3.scaleLinear()
            .domain([0, maxValue * 1.1])
            .range([innerRadius, outerRadius]);

        const svg = d3.select(this.chartContainer.nativeElement)
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .attr('viewBox', `${-width / 2} ${-height / 2} ${width} ${height}`)
            .attr('style', 'max-width: 100%; height: auto;');

        const g = svg.append('g');

        // Create Gaussian-like percentile bands centered on median
        // Calculate bands symmetrically around the median
        const getBand = (d: any, position: 'min' | 'inner-dark' | 'inner-light' | 'median' | 'outer-light' | 'outer-dark' | 'max'): number => {
            const median = d.median;
            const lowerRange = median - d.min;
            const upperRange = d.max - median;
            
            switch(position) {
                case 'min': return d.min;
                case 'inner-dark': return median - lowerRange * 0.6; // 60% from min toward median
                case 'inner-light': return median - lowerRange * 0.3; // 30% from min toward median
                case 'median': return median;
                case 'outer-light': return median + upperRange * 0.3; // 30% from median toward max
                case 'outer-dark': return median + upperRange * 0.6; // 60% from median toward max
                case 'max': return d.max;
            }
        };

        const layers = [
            { getInner: (d: any) => getBand(d, 'min'), getOuter: (d: any) => getBand(d, 'inner-dark'), darken: 30, label: 'min-inner-dark' },
            { getInner: (d: any) => getBand(d, 'inner-dark'), getOuter: (d: any) => getBand(d, 'inner-light'), darken: 20, label: 'inner-dark-light' },
            { getInner: (d: any) => getBand(d, 'inner-light'), getOuter: (d: any) => getBand(d, 'outer-light'), darken: 0, label: 'center (median)' },
            { getInner: (d: any) => getBand(d, 'outer-light'), getOuter: (d: any) => getBand(d, 'outer-dark'), darken: 20, label: 'outer-light-dark' },
            { getInner: (d: any) => getBand(d, 'outer-dark'), getOuter: (d: any) => getBand(d, 'max'), darken: 30, label: 'outer-dark-max' }
        ];

        layers.forEach((layer, layerIndex) => {
            const arc = d3.arc<any>()
                .innerRadius((d: any) => y(layer.getInner(d)))
                .outerRadius((d: any) => y(layer.getOuter(d)))
                .startAngle((d: any, i: number) => x(i.toString())!)
                .endAngle((d: any, i: number) => x(i.toString())! + x.bandwidth())
                .padAngle(0.02)
                .padRadius(innerRadius);

            const normalColor = Color.fromVar('--color-primary-0', '').darken(layer.darken).toHexString();

            g.append('g')
                .selectAll('path')
                .data(this.data)
                .join('path')
                .attr('fill', normalColor)
                .attr('d', arc as any)
                .attr('class', (d: any, i: number) => `segment-m${i} layer-${layerIndex}`);
        });

        // Create tooltip div
        const tooltip = d3.select('body')
            .append('div')
            .attr('class', 'radial-chart-tooltip')
            .style('position', 'absolute')
            .style('visibility', 'hidden')
            .style('background-color', 'rgba(0, 0, 0, 0.9)')
            .style('color', '#fff')
            .style('padding', '12px')
            .style('border-radius', '4px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('z-index', '1000');

        // Create invisible overlay for hover detection
        const hoverArc = d3.arc<any>()
            .innerRadius(innerRadius)
            .outerRadius(outerRadius)
            .startAngle((d: any, i: number) => x(i.toString())!)
            .endAngle((d: any, i: number) => x(i.toString())! + x.bandwidth())
            .padAngle(0.02)
            .padRadius(innerRadius);

        g.append('g')
            .selectAll('path')
            .data(this.data)
            .join('path')
            .attr('fill', 'transparent')
            .attr('d', hoverArc as any)
            .on('mouseover', (event: any, d: any) => {
                // Highlight all segments of this month
                const monthIndex = Array.from(this.data).indexOf(d);
                layers.forEach((layer, layerIndex) => {
                    const hoverColor = Color.fromVar('--color-primary-0', '').darken(layer.darken).lighten(15).toHexString();
                    d3.selectAll(`.segment-m${monthIndex}.layer-${layerIndex}`).attr('fill', hoverColor);
                });

                tooltip.style('visibility', 'visible')
                    .html(`
                        <div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #444; padding-bottom: 4px;">
                            ${monthNames[monthIndex]}
                        </div>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr><td style="padding: 2px 8px 2px 0;">Min:</td><td style="text-align: right; padding: 2px 0;">${this.moneyPipe.transform(d.min)}</td></tr>
                            <tr><td style="padding: 2px 8px 2px 0;">Q1:</td><td style="text-align: right; padding: 2px 0;">${this.moneyPipe.transform(d.q1)}</td></tr>
                            <tr><td style="padding: 2px 8px 2px 0;">Median:</td><td style="text-align: right; padding: 2px 0;">${this.moneyPipe.transform(d.median)}</td></tr>
                            <tr><td style="padding: 2px 8px 2px 0;">Q3:</td><td style="text-align: right; padding: 2px 0;">${this.moneyPipe.transform(d.q3)}</td></tr>
                            <tr><td style="padding: 2px 8px 2px 0;">Max:</td><td style="text-align: right; padding: 2px 0;">${this.moneyPipe.transform(d.max)}</td></tr>
                            <tr style="border-top: 1px solid #444;"><td style="padding: 2px 8px 2px 0; font-weight: bold;">Avg:</td><td style="text-align: right; padding: 2px 0; font-weight: bold;">${this.moneyPipe.transform(d.avg)}</td></tr>
                        </table>
                    `);
            })
            .on('mousemove', (event: any) => {
                tooltip.style('top', (event.pageY - 10) + 'px')
                    .style('left', (event.pageX + 10) + 'px');
            })
            .on('mouseout', () => {
                // Reset all segments to normal color
                layers.forEach((layer, layerIndex) => {
                    const normalColor = Color.fromVar('--color-primary-0', '').darken(layer.darken).toHexString();
                    d3.selectAll(`.layer-${layerIndex}`).attr('fill', normalColor);
                });
                tooltip.style('visibility', 'hidden');
            });

        // Draw continuous median line connecting all months
        const medianPoints = this.data.map((d: any, i: number) => {
            const angle = x(i.toString())! + x.bandwidth() / 2; // Center of each month segment
            const radius = y(d.median);
            return {
                x: Math.cos(angle - Math.PI / 2) * radius,
                y: Math.sin(angle - Math.PI / 2) * radius
            };
        });

        const medianLine = d3.line()
            .x((d: any) => d.x)
            .y((d: any) => d.y)
            .curve(d3.curveCardinalClosed.tension(0.5));

        g.append('path')
            .datum(medianPoints)
            .attr('d', medianLine as any)
            .attr('fill', 'none')
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 2);

        const xAxis = (g: any) => g
            .attr('text-anchor', 'middle')
            .call((g: any) => g.selectAll('g')
                .data(monthNames)
                .join('g')
                .attr('transform', (d: string, i: number) => {
                    const angle = (x(i.toString())! + x.bandwidth() / 2) * 180 / Math.PI - 90;
                    return `rotate(${angle}) translate(${labelRadius}, 0)`;
                })
                .call((g: any) => g.append('text')
                    .attr('transform', (d: string, i: number) => {
                        const angle = (x(i.toString())! + x.bandwidth() / 2) * 180 / Math.PI - 90;
                        return angle > 0 && angle < 180 ? 'rotate(90)translate(0,3)' : 'rotate(-90)translate(0,3)';
                    })
                    .style('font-size', '11px')
                    .style('font-weight', '500')
                    .style('fill', '#adb5bd')
                    .text((d: string) => d)));

        svg.append('g').call(xAxis);
    }
}
