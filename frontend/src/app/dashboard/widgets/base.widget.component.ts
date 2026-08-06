import { ChangeDetectionStrategy, Component, computed, inject, input, ResourceRef, signal, Signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { OptionType } from './widget-options/widget-options.component';
import { Dictionary } from '@constants/constants';
import { Serializable } from '@models/_core/serializable';
import { BaseWidgetListener } from './base.widget.listener';
import { GlobalService } from '@models/global.service';
import { modelResource } from '@models/http/model-resource';

export type TOptions = Dictionary<{ type: OptionType; value: unknown; i18n?: string }>;
export interface TWidgetConfig {
    widget: string;
    options: TOptions;
}

export const WidgetOptions = {
    maxItems: { 'max-items': { type: OptionType.Number, value: 999, i18n: $localize`:@@i18n.common.maxItems:max items` } },
    chartOnly: { 'chart-only': { type: OptionType.Boolean, value: false, i18n: $localize`:@@i18n.common.chartOnly:chart only` } },
    onlyMine: { 'only-mine': { type: OptionType.Boolean, value: false, i18n: $localize`:@@i18n.common.onlyMine:only mine` } },
    onlyMineAsPm: { 'only-mine-as-pm': { type: OptionType.Boolean, value: false, i18n: $localize`:@@i18n.common.onlyMineAsProjectManager:only mine as project manager` } },
};

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: '',
    host: {
        '[class.is-editing]': 'is_editing()'
    },
})
export abstract class BaseWidgetComponent {

    protected listener = inject(BaseWidgetListener);
    protected global = inject(GlobalService);

    defaultOptions: () => TOptions = () => ({});

    is_editing = input<boolean>();
    options    = input<TOptions>({});
    i          = input<number>();
    j          = input<number>();
    widget     = input<TWidgetConfig>();
    onlyChart  = input<boolean>(false);

    value: Signal<number | undefined> = signal(undefined);

    readonly hasInvoicesModule    = computed(() => this.global.user?.hasRole('invoicing') ?? false);
    readonly hasInvoicesValues    = computed(() => this.global.user?.hasRole('financial') ?? false);
    readonly hasInvoicesExpenses  = computed(() => this.global.user?.hasRole('financial') ?? false);
    readonly hasSettingsModule    = computed(() => this.global.user?.hasRole('admin') ?? false);
    readonly hasCrudProjectUpdate = computed(() => this.global.user?.hasRole('project_manager') ?? false);

    protected isReloading = false;

    readonly #resources: ResourceRef<unknown>[] = [];

    constructor() {
        this.listener.reloadRequested.pipe(takeUntilDestroyed()).subscribe(() => this.reload());
    }

    protected optionsResource<T>(stream: (options: Dictionary) => Observable<T>, enabled: () => boolean = () => true): ResourceRef<T | undefined> {
        const resource = modelResource(() => (enabled() ? this.getOptionsURI() : undefined), stream);
        this.#resources.push(resource);
        return resource;
    }

    protected headline(resource: ResourceRef<unknown>, compute: () => number): Signal<number | undefined> {
        return computed(() => (resource.hasValue() ? compute() : undefined));
    }

    reload(): void {
        this.#resources.forEach((_) => _.reload());
    }

    _onUpdate = ($event: TOptions) => {
        if (!this.isReloading) {
            const i = this.i();
            const j = this.j();
            if (i === undefined || j === undefined) return;
            this.listener.updated.next([$event, i, j]);
        }
    };
    onDelete = (_: unknown) => {
        const i = this.i();
        const j = this.j();
        if (i === undefined || j === undefined) return;
        this.listener.deleted.next([_, i, j]);
    };

    getI18n = () => 'WIDGET';
    getOptions = () => ({ ...this.defaultOptions(), ...this.options() });
    getOptionsURI = () => {
        const m: Dictionary = {};
        const opt = this.getOptions();
        for (const key of Object.keys(opt)) m[key] = opt[key].value;
        return m;
    };
    indexExceedsSettings = (i: number) => ('max-items' in this.getOptions() && 'value' in this.getOptions()['max-items'] ? ((this.getOptions()['max-items']?.value as number) ?? 0) <= i : true);
    badgeCount = (data: Serializable[]) => data.filter((_) => _.getBadge()).length;
}
