import { computed, Signal } from '@angular/core';
import { Observable } from 'rxjs';
import type { NxAction } from '@models/_core/nx.actions';

export interface IHasMarker {
    marker: number | null;
    update(data: Partial<IHasMarker>): Observable<unknown>;
}

const hasMarker = (that: object): that is IHasMarker => 'marker' in that;

export class Marker {
    static readonly COLORS = ['blue', 'indigo', 'purple', 'pink', 'red', 'orange', 'yellow', 'green', 'teal', 'cyan'] as const;

    static CLASS = (that: object): Signal<string> =>
        computed((): string => {
            if (!hasMarker(that)) return '';
            const color = that.marker === null ? undefined : this.COLORS[that.marker];
            return color ? `marker marker-${color}` : '';
        });

    static ACTIONS = (that: object): Signal<NxAction[]> =>
        computed((): NxAction[] =>
            !hasMarker(that)
                ? []
                : [
                    {
                        title: $localize`:@@i18n.common.marker:marker`,
                        group: true,
                        children: [
                            { title: $localize`:@@i18n.common.none:none`, group: true, action: () => that.update({ marker: null }) },
                            ...this.COLORS.map((color, index) => ({ title: color, group: true, action: () => that.update({ marker: index }) })),
                        ],
                    },
                ],
        );

    static indexFor(marker: string): number | null {
        const index = (this.COLORS as readonly string[]).indexOf(marker);
        return index >= 0 ? index : null;
    }
}
