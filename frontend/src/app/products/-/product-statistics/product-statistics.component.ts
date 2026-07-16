import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbTooltipModule, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { NgxDaterangepickerMd } from 'ngx-daterangepicker-material';
import { NgxEchartsDirective } from 'ngx-echarts';
import { ECHARTS_DEFAULT_TOOLTIP_OPTIONS } from '@charts/echarts-presets';
import * as echarts from 'echarts/core';
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent } from 'echarts/components';
import { BarChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { Nx } from '@app/nx/nx.directive';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { ProductService } from '@models/product/product.service';
import { Product } from '@models/product/product.model';
import { MoneyPipe } from '@pipes/money.pipe';
import { dayjs, Dayjs } from '@constants/dates';
import type { EChartsOption } from 'echarts';
import { Dictionary } from '@constants/constants';
import { ProductStatistics, ProductStatisticsTimelineEntry, ChartAxisTooltipParam } from '@models/api-response';
import { ProductGroup } from '@models/product/product-group.model';

echarts.use([TitleComponent, TooltipComponent, LegendComponent, GridComponent, BarChart, CanvasRenderer]);

@Component({
    selector: 'product-statistics',
    templateUrl: './product-statistics.component.html',
    styleUrls: ['./product-statistics.component.scss'],
    imports: [DecimalPipe, FormsModule, NgbTooltipModule, NgbDropdownModule, NgxDaterangepickerMd, NgxEchartsDirective, Nx, ToolbarComponent, MoneyPipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductStatisticsComponent {
    readonly #productService = inject(ProductService);

    readonly statistics = signal<ProductStatistics | null>(null);
    readonly rootGroups = signal<ProductGroup[]>([]);
    readonly selectedRootGroups = signal<ProductGroup[]>([]);
    readonly period = signal<{ startDate: Dayjs; endDate: Dayjs } | undefined>({
        startDate: dayjs().subtract(3, 'year'),
        endDate: dayjs(),
    });

    readonly chartOption = signal<EChartsOption>({
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'cross' },
            ...ECHARTS_DEFAULT_TOOLTIP_OPTIONS,
            formatter: (params) => {
                const items = params as ChartAxisTooltipParam[];
                let result = `<div style="text-align: center;"><strong>${items[0].axisValue}</strong></div>`;
                items.forEach((param) => {
                    const value = param.value || 0;
                    result += `<div style="display: flex; justify-content: space-between; align-items: center; margin: 2px 0; gap: 0.5rem;">`;
                    result += `<span style="display: flex; align-items: center;">`;
                    result += `<span style="display:inline-block;margin-right:5px;border-radius:10px;width:10px;height:10px;background-color:${param.color};"></span>`;
                    result += `${param.seriesName}</span>`;
                    result += `<span style="font-weight: bold;">€${value.toLocaleString()}</span>`;
                    result += `</div>`;
                });
                return result;
            },
        },
        legend: { data: [], top: 5 },
        grid: { left: '3%', right: '4%', bottom: '3%', top: '15%' },
        xAxis: { type: 'category', data: [], axisPointer: { type: 'shadow' } },
        yAxis: {
            type: 'value',
            axisLabel: { formatter: '€{value}', inside: true, align: 'left', margin: -60 },
            splitLine: { lineStyle: { color: '#222' } },
        },
        series: [],
    });

    readonly ranges = {
        'This year': [dayjs().startOf('year'), dayjs().endOf('year')],
        'Last year': [dayjs().subtract(1, 'year').startOf('year'), dayjs().subtract(1, 'year').endOf('year')],
        'Last 3 years': [dayjs().subtract(3, 'year'), dayjs()],
        'Last 5 years': [dayjs().subtract(5, 'year'), dayjs()],
        All: [dayjs('2000-01-01'), dayjs()],
    } satisfies Record<string, [Dayjs, Dayjs]>;

    readonly selectedGroupsText = computed(() => {
        const selected = this.selectedRootGroups();
        const all = this.rootGroups();
        if (!selected.length) return 'No groups selected';
        if (selected.length === all.length) return 'All groups';
        return `${selected.length} group${selected.length > 1 ? 's' : ''} selected`;
    });

    readonly hasChartData = computed(() => {
        const opt = this.chartOption();
        return opt?.series && Array.isArray(opt.series) && opt.series.length > 0;
    });

    constructor() {
        this.#productService.getRootGroups().subscribe((groups) => {
            this.rootGroups.set(groups);
            this.selectedRootGroups.set(groups.filter((g) => g.is_active));
            this.#loadStatistics();
        });
    }

    readonly onDateRangeChanged = () => this.#loadStatistics();

    readonly toggleRootGroup = (group: ProductGroup) => {
        this.selectedRootGroups.update(groups => {
            const index = groups.findIndex(g => g.id === group.id);
            return index > -1 ? groups.filter((_, i) => i !== index) : [...groups, group];
        });
        this.#loadStatistics();
    };

    readonly isRootGroupSelected = (group: ProductGroup) => this.selectedRootGroups().some(g => g.id === group.id);

    #loadStatistics() {
        if (!this.rootGroups().length || !this.selectedRootGroups().length) {
            this.statistics.set(null);
            return;
        }
        const p = this.period();
        const filters: Dictionary = {};
        if (p?.startDate) filters.dateStart = p.startDate.format('YYYY-MM-DD');
        if (p?.endDate) filters.dateEnd = p.endDate.format('YYYY-MM-DD');
        filters.rootGroupIds = this.selectedRootGroups().map(g => g.id);

        this.#productService.showStatistics(filters).subscribe((data: Dictionary) => {
            const toProducts = (arr: unknown) => Array.isArray(arr) ? arr.map((item) => Product.fromJson(item)) : [];
            this.statistics.set({
                top_products: toProducts(data.top_products),
                fastest_sellers: toProducts(data.fastest_sellers),
                most_repurchased: toProducts(data.most_repurchased),
                timeline: (data.timeline as Record<string, ProductStatisticsTimelineEntry[]>) || {},
            });
            this.#updateChart();
        });
    }

    #updateChart() {
        const stats = this.statistics();
        if (!stats?.timeline) return;

        const timelineData = stats.timeline;
        const months = Object.keys(timelineData).sort();

        const groups = new Map<number, { id: number; name: string; color: string }>();
        months.forEach(month => {
            timelineData[month].forEach((item) => {
                if (!groups.has(item.group_id)) {
                    groups.set(item.group_id, { id: item.group_id, name: item.group_name, color: item.group_color || '#007bff' });
                }
            });
        });

        const series: NonNullable<EChartsOption['series']> = [];
        groups.forEach((group, groupId) => {
            series.push({
                name: group.name,
                type: 'bar',
                stack: 'revenue',
                emphasis: { focus: 'series' },
                itemStyle: { color: group.color },
                data: months.map(month => {
                    const groupData = timelineData[month].find((item) => item.group_id === groupId);
                    return Math.max(0, groupData ? parseFloat(String(groupData.total_net)) : 0);
                }),
            });
        });

        this.chartOption.update(opt => ({
            ...opt,
            legend: { ...opt.legend, data: Array.from(groups.values()).map(g => g.name) },
            xAxis: { ...opt.xAxis, data: months.map(m => dayjs(m + '-01').format('MMM YYYY')) },
            series,
        }));
    }
}
