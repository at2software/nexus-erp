import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbTooltipModule, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { NgxDaterangepickerMd } from 'ngx-daterangepicker-material';
import { NgxEchartsDirective } from 'ngx-echarts';
import { ECHARTS_DEFAULT_TOOLTIP_OPTIONS } from '@charts/ChartOptions';
import * as echarts from 'echarts/core';
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent } from 'echarts/components';
import { BarChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { NexusModule } from '@app/nx/nexus.module';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { ProductService } from 'src/models/product/product.service';
import { Product } from 'src/models/product/product.model';
import { MoneyPipe } from 'src/pipes/money.pipe';
import moment from 'moment';

// Register ECharts components
echarts.use([TitleComponent, TooltipComponent, LegendComponent, GridComponent, BarChart, CanvasRenderer]);

@Component({
    selector: 'product-statistics',
    templateUrl: './product-statistics.component.html',
    styleUrls: ['./product-statistics.component.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, NgbTooltipModule, NgbDropdownModule, NgxDaterangepickerMd, NgxEchartsDirective, NexusModule, ToolbarComponent, MoneyPipe]
})
export class ProductStatisticsComponent implements OnInit, AfterViewInit {
    statistics: any = null;
    period?: { startDate: any, endDate: any } = { startDate: moment().subtract(3, 'year'), endDate: moment() };
    rootGroups: any[] = [];
    selectedRootGroups: any[] = [];
    chartOption: any = {};
    
    ranges: any = {
        'This year': [moment().startOf('year'), moment().endOf('year')],
        'Last year': [moment().subtract(1, 'year').startOf('year'), moment().subtract(1, 'year').endOf('year')],
        'Last 3 years': [moment().subtract(3, 'year'), moment()],
        'Last 5 years': [moment().subtract(5, 'year'), moment()],
        'All': [moment('2000-01-01'), moment()]
    };

    constructor(private productService: ProductService) {}

    ngOnInit() {
        this.loadRootGroups();
    }

    ngAfterViewInit() {
        this.initChart();
    }
    
    loadRootGroups() {
        this.productService.getRootGroups().subscribe({
            next: (groups: any[]) => {
                this.rootGroups = groups;
                // Default: only select active root groups
                this.selectedRootGroups = groups.filter(group => group.is_active);
                // Load statistics after groups are loaded and filtered
                this.#loadStatistics();
            },
            error: (error: any) => {
                console.error('Error loading root groups:', error);
            }
        });
    }

    onDateRangeChanged() {
        this.#loadStatistics();
    }

    #loadStatistics() {
        // Don't load statistics if no groups are loaded yet or no groups are selected
        if (this.rootGroups.length === 0 || this.selectedRootGroups.length === 0) {
            this.statistics = null;
            return;
        }
        
        const filters: any = {};
        if (this.period?.startDate) {
            filters.dateStart = this.period.startDate.format('YYYY-MM-DD');
        }
        if (this.period?.endDate) {
            filters.dateEnd = this.period.endDate.format('YYYY-MM-DD');
        }
        // Send rootGroupIds since we know groups are selected
        filters.rootGroupIds = this.selectedRootGroups.map(group => group.id);
        
        this.productService.showStatistics(filters).subscribe({
            next: (data: any) => {
                // Convert plain JSON objects to Product instances
                const toProducts = (arr: any) => Array.isArray(arr) ? arr.map((item: any) => Product.fromJson(item)) : []
                this.statistics = {
                    top_products: toProducts(data.top_products),
                    fastest_sellers: toProducts(data.fastest_sellers),
                    most_repurchased: toProducts(data.most_repurchased),
                    timeline: data.timeline || {}
                };
                this.updateChart();
            },
            error: (error: any) => {
                console.error('Error loading product statistics:', error);
            }
        });
    }
    
    toggleRootGroup(group: any) {
        const index = this.selectedRootGroups.findIndex(g => g.id === group.id);
        if (index > -1) {
            this.selectedRootGroups.splice(index, 1);
        } else {
            this.selectedRootGroups.push(group);
        }
        this.#loadStatistics();
    }
    
    isRootGroupSelected(group: any): boolean {
        return this.selectedRootGroups.some(g => g.id === group.id);
    }
    
    onGroupFilterChanged() {
        this.#loadStatistics();
    }
    
    get selectedGroupsText(): string {
        if (this.selectedRootGroups.length === 0) {
            return 'No groups selected';
        }
        if (this.selectedRootGroups.length === this.rootGroups.length) {
            return 'All groups';
        }
        return `${this.selectedRootGroups.length} group${this.selectedRootGroups.length > 1 ? 's' : ''} selected`;
    }

    get hasChartData(): boolean {
        return this.chartOption && this.chartOption.series && Array.isArray(this.chartOption.series) && this.chartOption.series.length > 0;
    }


    initChart() {
        this.chartOption = {
            title: {
                text: '',
                left: 'center'
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross'
                },
                ...ECHARTS_DEFAULT_TOOLTIP_OPTIONS,
                formatter: (params: any) => {
                    let result = `<div style="text-align: center;"><strong>${params[0].axisValue}</strong></div>`;
                    params.forEach((param: any) => {
                        const value = param.value || 0;
                        result += `<div style="display: flex; justify-content: space-between; align-items: center; margin: 2px 0; gap: 0.5rem;">`;
                        result += `<span style="display: flex; align-items: center;">`;
                        result += `<span style="display:inline-block;margin-right:5px;border-radius:10px;width:10px;height:10px;background-color:${param.color};"></span>`;
                        result += `${param.seriesName}</span>`;
                        result += `<span style="font-weight: bold;">€${value.toLocaleString()}</span>`;
                        result += `</div>`;
                    });
                    return result;
                }
            },
            legend: {
                data: [],
                top: 5
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                top: '15%'
            },
            xAxis: {
                type: 'category',
                data: [],
                axisPointer: {
                    type: 'shadow'
                }
            },
            yAxis: {
                type: 'value',
                axisLabel: {
                    formatter: '€{value}',
                    inside: true,
                    align: 'left',
                    margin: -60
                },
                splitLine: {
                    lineStyle: {
                        color: '#222'
                    }
                }
            },
            series: []
        };
    }

    updateChart() {
        if (!this.statistics?.timeline) {
            return;
        }

        // Process timeline data from backend
        const timelineData = this.statistics.timeline;
        const months = Object.keys(timelineData).sort();
        
        // Get unique groups
        const groups = new Map();
        months.forEach(month => {
            timelineData[month].forEach((item: any) => {
                if (!groups.has(item.group_id)) {
                    groups.set(item.group_id, {
                        id: item.group_id,
                        name: item.group_name,
                        color: item.group_color || '#007bff'
                    });
                }
            });
        });

        // Prepare series data
        const series: any[] = [];
        groups.forEach((group, groupId) => {
            const data = months.map(month => {
                const monthData = timelineData[month];
                const groupData = monthData.find((item: any) => item.group_id === groupId);
                const value = groupData ? parseFloat(groupData.total_net) : 0;
                return Math.max(0, value); // Limit to minimum of 0
            });

            series.push({
                name: group.name,
                type: 'bar',
                stack: 'revenue',
                emphasis: {
                    focus: 'series'
                },
                itemStyle: {
                    color: group.color
                },
                data: data
            });
        });

        // Update chart options
        this.chartOption = {
            ...this.chartOption,
            legend: {
                ...this.chartOption.legend,
                data: Array.from(groups.values()).map(g => g.name)
            },
            xAxis: {
                ...this.chartOption.xAxis,
                data: months.map(month => {
                    const date = moment(month + '-01');
                    return date.format('MMM YYYY');
                })
            },
            series: series
        };
    }
}