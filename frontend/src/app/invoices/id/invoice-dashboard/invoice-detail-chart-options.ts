import { DataLabelFormatterContextDto } from '@models/_core/api-response';

export const InvoiceDetailChartOptions = {
    series: [] as { name: string; data: number[][]; color: string }[],
    chart: {
        height: 150,
        type: 'scatter',
        zoom: { enabled: false },
    },
    dataLabels: {
        enabled: true,
        formatter: (_val: number, { seriesIndex, w }: DataLabelFormatterContextDto) => w.config.series[seriesIndex].name,
    },
    tooltip: {
        shared: false,
        y: { formatter: () => '' },
        x: { show: false },
        title: { formatter: () => ' ' },
    },
    grid: { padding: { left: 50, right: 50 } },
    yaxis: { tickAmount: 1, min: 0, max: 5 },
    xaxis: { type: 'datetime', min: undefined as number | undefined, max: undefined as number | undefined },
};
