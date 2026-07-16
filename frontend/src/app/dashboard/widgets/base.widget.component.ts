import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OptionType } from './widget-options/widget-options.component';
import { Dictionary } from '@constants/constants';
import { Serializable } from '@models/serializable';
import { BaseWidgetListener } from './base.widget.listener';
import { GlobalService } from '@models/global.service';

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
    reload(): void { /** overwritten in subclasses */ }

    is_editing = input<boolean>();
    options    = input<TOptions>({});
    i          = input<number>();
    j          = input<number>();
    widget     = input<TWidgetConfig>();
    onlyChart  = input<boolean>(false);

    value = signal<number | undefined>(undefined);

    readonly hasInvoicesModule    = computed(() => this.global.user?.hasRole('invoicing') ?? false);
    readonly hasInvoicesValues    = computed(() => this.global.user?.hasRole('financial') ?? false);
    readonly hasInvoicesExpenses  = computed(() => this.global.user?.hasRole('financial') ?? false);
    readonly hasSettingsModule    = computed(() => this.global.user?.hasRole('admin') ?? false);
    readonly hasCrudProjectUpdate = computed(() => this.global.user?.hasRole('project_manager') ?? false);

    protected isReloading = false;

    constructor() {
        this.listener.reloadRequested.pipe(takeUntilDestroyed()).subscribe(() => this.reload());
        effect(() => {
            this.options();
            this.reload();
        });
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
    badgeCount = (data: Serializable[]) => data.filter((_) => _.badge()).length;
}
