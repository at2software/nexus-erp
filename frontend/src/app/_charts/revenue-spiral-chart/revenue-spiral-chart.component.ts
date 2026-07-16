import { ChangeDetectionStrategy, Component, ElementRef, viewChild, effect, untracked, input } from '@angular/core';
import { Color } from '@constants/Color';
import { TimeValuePoint } from '@models/api-response';
import { interpolateRgb, scaleLinear, select } from 'd3';
import { dayjs } from '@constants/dates';


@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'revenue-spiral-chart',
    templateUrl: './revenue-spiral-chart.component.html',
    styleUrls: ['./revenue-spiral-chart.component.scss'],
    imports: [],
})
export class RevenueSpiralChartComponent {
    spiralContainer = viewChild<ElementRef<HTMLDivElement>>('spiralContainer');

    data = input<TimeValuePoint[] | undefined>(undefined);
    height = input<number>(400);
    primaryColor = input<string>('#00ff99');
    smoothing = input<number>(0);

    constructor() {
        effect(() => {
            const container = this.spiralContainer();
            this.data();
            this.smoothing();
            if (container) untracked(() => this.renderSpiral());
        });
    }

    getSmoothedData(): TimeValuePoint[] {
        const data = this.data();
        if (!data || this.smoothing() === 0) return data || [];

        const smoothed: TimeValuePoint[] = [];
        const smoothing = this.smoothing();
        for (let i = smoothing; i < data.length; i++) {
            const windowData = data.slice(i - smoothing, i + 1);
            const avgRevenue = windowData.reduce((sum, d) => sum + d.value, 0) / windowData.length;
            smoothed.push({
                period: data[i].period,
                value: avgRevenue,
            });
        }
        return smoothed;
    }

    renderSpiral() {
        const ref = this.spiralContainer();
        if (!ref || !this.data() || this.data()!.length === 0) return;

        const displayData = this.getSmoothedData();
        if (displayData.length === 0) return;

        const container = ref.nativeElement;
        const width = container.clientWidth || 400;
        const height = this.height();
        const centerX = width / 2;
        const centerY = height / 2;
        const maxRadius = Math.min(width, height) / 2 - 40;

        select(container).selectAll('*').remove();

        const svg = select(container).append('svg').attr('width', width).attr('height', height);

        const g = svg.append('g').attr('transform', `translate(${centerX},${centerY})`);

        // Sort data by date
        const sortedData = [...displayData].sort((a, b) => dayjs(a.period, 'YYYY-MM').valueOf() - dayjs(b.period, 'YYYY-MM').valueOf());

        const dataLength = sortedData.length;

        // Calculate max revenue for scaling from ORIGINAL data (not smoothed)
        // This ensures consistent scaling regardless of smoothing
        const maxRevenue = Math.max(...(this.data()?.map((d) => d.value) || []));

        // Color interpolator with hue rotation
        // Newest (t=1) = primary color
        // Oldest (t=0) = primary color rotated +90° and darkened
        const primaryColorObj = new Color(this.primaryColor());
        const hueRotatedDark = primaryColorObj.clone().spin(120).darken(20);
        const colorInterpolator = interpolateRgb(hueRotatedDark.toHexString(), this.primaryColor());

        // Revenue scale - maps revenue directly to radius (max revenue = maxRadius)
        const revenueScale = scaleLinear()
            .domain([0, maxRevenue * 0.55])
            .range([maxRadius * 0.15, maxRadius]);

        // Create spiral coordinates
        const spiralPoints = sortedData.map((d, i) => {
            const date = dayjs(d.period, 'YYYY-MM');

            // Month determines angle (0 = Jan at top, clockwise)
            const month = date.month(); // 0-11
            // Start at top (270 degrees = -90 degrees) and go clockwise
            const angleInDegrees = month * 30 - 90; // 30 degrees per month
            const angleInRadians = (angleInDegrees * Math.PI) / 180;

            // Revenue directly determines radius (absolute from center)
            const radius = revenueScale(d.value);

            // Time progress for color (0 = oldest, 1 = newest)
            const t = i / (dataLength - 1);
            return {
                x: Math.cos(angleInRadians) * radius,
                y: Math.sin(angleInRadians) * radius,
                angle: angleInRadians,
                radius: radius,
                color: colorInterpolator(t),
                period: d.period,
                value: d.value,
                month: month,
                year: date.year(),
                t: t,
            };
        });

        // Draw month divider lines
        for (let month = 0; month < 12; month++) {
            const angleInDegrees = month * 30 - 90;
            const angleInRadians = (angleInDegrees * Math.PI) / 180;

            g.append('line')
                .attr('x1', 0)
                .attr('y1', 0)
                .attr('x2', Math.cos(angleInRadians) * maxRadius)
                .attr('y2', Math.sin(angleInRadians) * maxRadius)
                .attr('stroke', '#444')
                .attr('stroke-width', 0.5)
                .attr('opacity', 0.3);
        }

        // Draw month labels
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        monthNames.forEach((monthName, month) => {
            const angleInDegrees = month * 30 - 90;
            const angleInRadians = (angleInDegrees * Math.PI) / 180;
            const labelRadius = maxRadius + 15;

            g.append('text')
                .attr('x', Math.cos(angleInRadians) * labelRadius)
                .attr('y', Math.sin(angleInRadians) * labelRadius)
                .attr('text-anchor', 'middle')
                .attr('dy', '0.35em')
                .attr('fill', '#999')
                .attr('font-size', '9px')
                .text(monthName);
        });

        // Draw lines only between consecutive months
        for (let i = 1; i < spiralPoints.length; i++) {
            const prev = spiralPoints[i - 1];
            const curr = spiralPoints[i];

            // Check if months are consecutive
            const prevDate = dayjs(prev.period, 'YYYY-MM');
            const currDate = dayjs(curr.period, 'YYYY-MM');
            const monthsDiff = currDate.diff(prevDate, 'months');

            // Only draw line if exactly 1 month apart
            if (monthsDiff === 1) {
                g.append('line').attr('x1', prev.x).attr('y1', prev.y).attr('x2', curr.x).attr('y2', curr.y).attr('stroke', prev.color).attr('stroke-width', 2).attr('opacity', 0.7);
            }
        }

        // Draw circles at each month point
        g.selectAll('circle.month-point')
            .data(spiralPoints)
            .join('circle')
            .attr('class', 'month-point')
            .attr('cx', (d) => d.x)
            .attr('cy', (d) => d.y)
            .attr('r', 3)
            .attr('fill', (d) => d.color)
            .attr('stroke', '#333')
            .attr('stroke-width', 0.5)
            .attr('opacity', 0.9)
            .append('title')
            .text((d) => `${dayjs(d.period, 'YYYY-MM').format('MMM YYYY')}: ${d.value.toLocaleString()}`);

        // Add center point
        g.append('circle').attr('cx', 0).attr('cy', 0).attr('r', 4).attr('fill', hueRotatedDark.toHexString());
    }
}
