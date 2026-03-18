import { NxGlobal } from "@app/nx/nx.global"
import { deepMerge } from "src/constants/deepMerge"
import { ShortPipe } from "src/pipes/short.pipe"

export const ECHARTS_DEFAULT_TOOLTIP_OPTIONS = {
    appendToBody: true,
    className: 'echarts-tooltip',
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderWidth: 0,
    textStyle: {},
    extraCssText: ''
}

// ECharts simple configuration for widget charts
export const EChartsSimpleOptions = {
    backgroundColor: 'transparent',
    grid: {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        containLabel: false
    },
    xAxis: {
        type: 'time',
        show: false,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false }
    },
    yAxis: {
        type: 'value',
        show: false,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false }
    },
    tooltip: {
        trigger: 'axis',
        ...ECHARTS_DEFAULT_TOOLTIP_OPTIONS
    },
    animation: false
}

// ECharts stacked bar chart configuration for widgets
export const EChartsStackedBarOptions = {
    ...EChartsSimpleOptions,
    xAxis: {
        type: 'time',
        show: false,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false }
    },
    tooltip: {
        trigger: 'axis',
        ...ECHARTS_DEFAULT_TOOLTIP_OPTIONS,
        axisPointer: {
            type: 'shadow'
        }
    }
}

// ECharts dual shadow configuration for area styles
export const EChartsDualShadowAreaStyle = {
    // shadowBlur: 2,
    // shadowColor: '#fff',
    // shadowOffsetX: 0,
    // shadowOffsetY: 1,
    // Second shadow using CSS filter for bottom shadow
    filter: 'drop-shadow(0 -1px 2px #09f)'
}

// ECharts range area chart configuration for forecast widgets
export const EChartsRangeAreaOptions = {
    ...EChartsSimpleOptions,
    xAxis: {
        type: 'time',
        show: false,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false }
    },
    yAxis: {
        type: 'value',
        show: false,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false }
    },
    tooltip: {
        trigger: 'axis',
        ...ECHARTS_DEFAULT_TOOLTIP_OPTIONS,
        confine: true
    }
}

// ECharts funnel chart configuration for marketing components
export const EChartsFunnelOptions = {
    backgroundColor: 'transparent',
    tooltip: {
        trigger: 'item',
        ...ECHARTS_DEFAULT_TOOLTIP_OPTIONS
    },
    legend: {
        show: false
    },
    animation: false
}

export const ChartOptionsSparkline = { chart: { sparkline: { enabled: true } } }
export const ChartOptionsToolbarHidden = { chart: { toolbar: { show: false } } }
export const ChartOptionsLegendHidden = { legend: { show: false } }
export const ChartOptionsDataLabelsHidden = { dataLabels: { enabled: false } }
export const ChartOptionsAnimationsDisabled = { chart: { animations: { enabled: false } } }
export const ChartOptionsMinimal = deepMerge({
    chart: {
        background: 'transparent',
    },
    yaxis: {
        show: false,
    },
    xaxis: {
        show: false,
    },
    grid: {
        borderColor: 'var(--bs-border)'
    },
    tooltip: {
        enabled: true,
        theme: 'dark',
        shared: true,
        intersect: false,
        followCursor: false,
        x: {
            show: true,
            format: 'yyyy.MM.dd',
            formatter: undefined,
        },
        fixed: {
            enabled: true,
            position: 'bottomRight',
            offsetX: 10,
            offsetY: 10
        }
    },
},
    ChartOptionsToolbarHidden,
    ChartOptionsLegendHidden,
    ChartOptionsAnimationsDisabled,
    ChartOptionsDataLabelsHidden
)

const localized = (_: number) => _.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + NxGlobal.global.currencySymbol()

export const ChartOptionsPieLabels = {
    donut: {
        labels: {
            show: true,
            name: {
                show: true,
                color: undefined,
                offsetY: -10,
            },
            value: {
                color: '#ffffff',
                offsetY: -7,
                formatter: (w: any) => localized(parseFloat(w))
            },
            total: {
                show: true,
                label: 'Total',
                color: '#ffffff',
                formatter: (w: any) => {
                    const sum = w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
                    return localized(sum);
                }
            },
        }
    }
}

export const annotate = (v: number, offset: number, pipe: ShortPipe) => ({
    y: v,
    strokeDashArray: 3,
    borderColor: '#000000',
    label: {
        text: pipe.transform(v),
        offsetY: offset,
        offsetX: -5,
        borderWidth: 0,
        position: 'right',
        textAnchor: 'end',
        style: {
            color: '#ffffff44',
            background: 'transparent'
        }
    }
})
export const annotatex = (x: any, _offset: number, _title:string) => ({
    x: x,
    // strokeDashArray: 3,
    // borderColor: '#000000',
    label: {
        text: 'ℹ️',
        // offsetY: offset,
        // offsetX: offset,
        // borderWidth: 0,
        // position: 'right',
        // textAnchor: 'end',
        // style: {
        //     color: '#ffffff44',
        //     background: 'transparent'
        // }
    }
})
export const pointAnnotationOptions = {
    marker: {
        size: 10,
        fillColor: "#fff",
        strokeColor: "#fff",
        strokeWidth: 3,
        shape: "circle",
        radius: 10,
        OffsetX: 0,
        OffsetY: 0,
        cssClass: '',
    },
}