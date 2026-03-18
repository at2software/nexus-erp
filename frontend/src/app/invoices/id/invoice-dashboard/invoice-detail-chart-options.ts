import { ChartOptionsMinimal } from "@charts/ChartOptions";
import { deepCopy } from "@constants/deepClone";
import { deepMerge } from "@constants/deepMerge";

export const InvoiceDetailChartOptions = deepMerge(deepCopy(ChartOptionsMinimal), {
    series: [],
    chart: {
        height: 150,
        type: 'scatter',
        zoom: { enabled: false },
    },
    dataLabels: { 
        enabled: true, formatter: (val:any, { seriesIndex, _dataPointIndex, w }:any) => w.config.series[seriesIndex].name },
    tooltip: { 
        shared: false, 
        y: { formatter: () => '' },
        x: { show: false },
        title: { formatter: () => ' '}
    },
    grid: { padding: { left: 50, right: 50 } },
    yaxis: { tickAmount: 1, min: 0, max: 5 },
    xaxis: { type: 'datetime' },
})