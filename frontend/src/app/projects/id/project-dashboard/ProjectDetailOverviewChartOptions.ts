import { ChartOptionsMinimal, ChartOptionsSparkline } from "@charts/ChartOptions";
import { deepMerge } from "@constants/deepMerge";

export const ProjectDetailOverviewChartOptions = deepMerge({}, ChartOptionsMinimal, ChartOptionsSparkline, {
    series: [],
    chart: {
        height: 100,
        type: "area",
        stacked: true,
        toolbar: { show: false },
        zoom: { enabled: false },
    },
    grid: { padding: { left: 0, right: 0, bottom: 0 } },
    stroke: { width: 1, curve: 'straight', colors: ['#444444'] },
    tooltip: {
        intersect: false,
        shared: true,
        enabled: true,

        fixed: {
            position: 'topRight',
            enabled: true,
            offsetX: 150,
            offsetY: -30
        },
    },
    fill: {
        opacity: 1,
        type: 'solid'
    },
    yaxis: {
        show: true,
        showAlways: true,
        floating: true,
        opposite: true,
        decimalsInFloat: 0,
        labels: {
            show: true,
            align: 'right',
            offsetX: 5,
            offsetY: 0,
        },
    },
    xaxis: {
        decimalsInFloat: 0,
        type: 'datetime',
        show: false,
        labels: { show: false },
        axisBorder: { show: false }
    },
})