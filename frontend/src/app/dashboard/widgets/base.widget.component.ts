import { ChangeDetectionStrategy, Component, DestroyRef, EventEmitter, HostBinding, inject, input, OnChanges, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OptionType } from './widget-options/widget-options.component';
import { Dictionary } from '@constants/constants';
import { Serializable } from '@models/serializable';
import { BaseWidgetListener } from './base.widget.listener';
import { GlobalService } from '@models/global.service';

export type TOptions = Record<string, { type: OptionType; value: any; i18n?: string }>;

export const WidgetOptions = {
    maxItems: { 'max-items': { type: OptionType.Number, value: 999, i18n: $localize`:@@i18n.common.maxItems:max items` } },
    chartOnly: { 'chart-only': { type: OptionType.Boolean, value: false, i18n: $localize`:@@i18n.common.chartOnly:chart only` } },
    onlyMine: { 'only-mine': { type: OptionType.Boolean, value: false, i18n: $localize`:@@i18n.common.onlyMine:only mine` } },
    onlyMineAsPm: { 'only-mine-as-pm': { type: OptionType.Boolean, value: false, i18n: $localize`:@@i18n.common.onlyMineAsProjectManager:only mine as project manager` } },
};

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: '',
    standalone: true,
})
export abstract class BaseWidgetComponent implements OnInit, OnChanges {
    defaultOptions: () => TOptions = () => ({});
    reload(): void {
        // to be overridden
    }

    protected listener = inject(BaseWidgetListener);
    protected global = inject(GlobalService);
    protected isReloading = false;
    #destroyRef = inject(DestroyRef);
    #reloadSub?: { unsubscribe(): void };

    value = signal<number | undefined>(undefined);

    get hasInvoicesModule() { return this.global.user?.hasRole('invoicing') ?? false; }
    get hasInvoicesValues() { return this.global.user?.hasRole('financial') ?? false; }
    get hasInvoicesExpenses() { return this.global.user?.hasRole('financial') ?? false; }
    get hasSettingsModule() { return this.global.user?.hasRole('admin') ?? false; }
    get hasCrudProjectUpdate() { return this.global.user?.hasRole('project_manager') ?? false; }

    is_editing = input<boolean>();
    options = input<any>();
    i = input<number>();
    j = input<number>();
    widget = input<any>();
    onReload = input<EventEmitter<any>>();
    onlyChart = input<boolean>(false);

    @HostBinding('class.is-editing') get classEdit() { return this.is_editing(); }

    ngOnInit() { this.reload(); }

    ngOnChanges(a: any) {
        if ('onReload' in a) {
            this.#reloadSub?.unsubscribe();
            this.#reloadSub = this.onReload()
                ?.pipe(takeUntilDestroyed(this.#destroyRef))
                .subscribe(() => this.reload());
        }
        if ('options' in a && !a['options'].firstChange) {
            this.reload();
        }
    }

    _onUpdate = ($event: any) => {
        if (!this.isReloading) {
            this.listener.updated.next([$event, this.i()!, this.j()!]);
        }
    };
    onDelete = ($event: any) => this.listener.deleted.next([$event, this.i()!, this.j()!]);

    getI18n = () => 'WIDGET';
    getOptions = () => ({ ...this.defaultOptions(), ...this.options() });
    getOptionsURI = () => {
        const m: Dictionary = {};
        const opt = this.getOptions();
        for (const key of Object.keys(opt)) m[key] = opt[key].value;
        return m;
    };
    indexExceedsSettings = (i: number) => ('max-items' in this.getOptions() && 'value' in this.getOptions()['max-items'] ? (this.getOptions()['max-items']?.value ?? 0) <= i : true);
    badgeCount = (data: Serializable[]) => data.filter((_) => _.badge()).length;
}
