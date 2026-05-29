import { computed } from '@angular/core';
import { Observable } from 'rxjs';

export interface IHasMarker {
    marker: number | null;
    update(data: Partial<IHasMarker>): Observable<any>;
}

export class Marker {
    static readonly COLORS = ['blue', 'indigo', 'purple', 'pink', 'red', 'orange', 'yellow', 'green', 'teal', 'cyan'] as const;
    static CLASS = (that: any) => computed((): string => {
        if (!('marker' in that)) return '';
        const color = this.COLORS[(that as any).marker as number];
        return color ? `marker marker-${color}` : '';
    });
    static ACTIONS = (that: any) => computed(() => !('marker' in that) ? [] : [{
        title: $localize`:@@i18n.common.marker:marker`,
        group: true,
        children: [
        { title: $localize`:@@i18n.common.none:none`, group: true, action: () => that.update({ marker: null }) },
            ...this.COLORS.map((color: string, index: number) => ({ title: color, group: true, action: () => that.update({ marker: index }) })),
        ],
    }])
    static indexFor(marker: string): number | null {
        const index = this.COLORS.indexOf(marker as any);
        return index >= 0 ? index : null;
    }
}

