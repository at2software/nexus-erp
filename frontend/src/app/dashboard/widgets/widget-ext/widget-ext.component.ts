import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { BaseWidgetComponent } from '../base.widget.component';
import { OptionType } from '../widget-options/widget-options.component';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NexusHttpInterceptor } from '@app/http.interceptor';
import { Color } from '@constants/Color';
import moment from 'moment';

import { WidgetsModule } from '../widgets.module';
import { EChartsSimpleOptions } from '@charts/echarts-presets';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'widget-ext',
    templateUrl: './widget-ext.component.html',
    styleUrls: ['./widget-ext.component.scss', './../base.widget.component.scss'],
    standalone: true,
    imports: [WidgetsModule],
})
export class WidgetExtComponent extends BaseWidgetComponent {
    chartOptions = signal<any>({ ...EChartsSimpleOptions, series: [] });
    #echartsInstance: any;
    #http = inject(HttpClient);

    defaultOptions = () => ({
        title: { type: OptionType.String, value: 'External chart', i18n: $localize`:@@i18n.common.title:title` },
        url: { type: OptionType.String, value: '', i18n: $localize`:@@i18n.common.url:URL` },
        headers: { type: OptionType.String, value: '', i18n: $localize`:@@i18n.common.headers:headers` },
    });

    reload() {
        const url = this.getOptions().url.value;
        const additionalHeaders = this.getOptions().headers.value.split(' ');
        const headerOptions: any = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': 'true',
            'Cache-Control': 'no-cache, no-store, must-revalidate, post-check=0, pre-check=0',
            Pragma: 'no-cache',
            Expires: '0',
        };
        if (additionalHeaders.length) headerOptions[additionalHeaders[0]] = additionalHeaders[1];

        if (!url) return;

        NexusHttpInterceptor.add(url, new HttpHeaders(headerOptions));
        this.#http.get(url).subscribe((data: any) => {
            const xBounds: [string?, string?] = [undefined, undefined];
            for (const _ of data.data) {
                if (xBounds[0] === undefined) xBounds[0] = _.data[0].x;
                if (xBounds[0]!.localeCompare(_.data[0].x) > 0) xBounds[0] = _.data[0].x;
                if (xBounds[1] === undefined) xBounds[1] = _.data.last().x;
                if (xBounds[1]!.localeCompare(_.data.last().x) < 0) xBounds[1] = _.data.last().x;
            }

            const xKeys: Record<string, { x: string; y: number }> = {};
            for (let i = moment(xBounds[0]); i <= moment(xBounds[1]); i.add(1, 'days')) {
                xKeys[i.format('YYYY-MM-DD')] = { x: i.format('YYYY-MM-DD'), y: 0 };
            }

            if (!('data' in data)) return console.error('No data returned from server');
            if (!Array.isArray(data['data'])) return console.error('data is not an array');

            let count = 0;
            const echartsData = data['data']
                .map((_: any) => {
                    if (!('data' in _) || !Array.isArray(_['data'])) return null;
                    count += _['data'].reduce((a: number, b: any) => a + b['y'], 0);
                    const keys = structuredClone(xKeys);
                    _['data'].forEach((b: any) => { if (b['x'] in keys) keys[b['x']].y += b['y']; });
                    return {
                        name: _['name'],
                        type: 'line' as const,
                        stack: 'external',
                        symbol: 'none',
                        areaStyle: { opacity: 0.6 },
                        lineStyle: { width: 2, color: Color.uniqueColorFromString(_['name']) },
                        itemStyle: { color: Color.uniqueColorFromString(_['name']) },
                        data: Object.values(keys).map((point: any) => [point.x, point.y]),
                        smooth: false,
                    };
                })
                .filter((series: any) => series !== null);

            this.value.set(count);
            this.chartOptions.set({ ...this.chartOptions(), series: echartsData });
            this.#echartsInstance?.setOption(this.chartOptions(), true);
        });
    }

    onChartInit = (ec: any) => (this.#echartsInstance = ec);
}
