import { Component, ContentChild, EventEmitter, HostBinding, inject, input, OnChanges, OnInit } from "@angular/core";
import { OptionType, WidgetOptionsComponent } from "./widget-options/widget-options.component";
import { Dictionary } from "src/constants/constants";
import { Serializable } from "src/models/serializable";
import { BaseWidgetListener } from "./base.widget.listener";
import { GlobalService } from "src/models/global.service";

export type TOptions = Record<string, {type:OptionType, value:any, i18n?:string}>;

export const WidgetOptions = {
    maxItems: { 'max-items': { type:OptionType.Number, value:999, i18n: $localize`:@@i18n.common.maxItems:max items`}},
    chartOnly: { 'chart-only': { type:OptionType.Boolean, value:false, i18n: $localize`:@@i18n.common.chartOnly:chart only`}},
    onlyMine: { 'only-mine': { type:OptionType.Boolean, value:false, i18n: $localize`:@@i18n.common.onlyMine:only mine`}},
    onlyMineAsPm: { 'only-mine-as-pm': { type:OptionType.Boolean, value:false, i18n: $localize`:@@i18n.common.onlyMineAsProjectManager:only mine as project manager`}},
};

@Component({
    template: '',
    standalone: true
})
export abstract class BaseWidgetComponent implements OnInit, OnChanges {
    
    defaultOptions : (() => TOptions) = () => ({
        // can be overwritten by child components
    })
    reload ():void {
        // can be overwritten by child components
    }

    protected listener = inject(BaseWidgetListener)
    protected global = inject(GlobalService)
    protected isReloading:boolean = false

    value?:number = undefined
    
    get hasInvoicesModule   () { return this.global.user?.hasRole('invoicing')       ?? false }
    get hasInvoicesValues   () { return this.global.user?.hasRole('financial')       ?? false }
    get hasInvoicesExpenses () { return this.global.user?.hasRole('financial')       ?? false }
    get hasSettingsModule   () { return this.global.user?.hasRole('admin')           ?? false }
    get hasCrudProjectUpdate() { return this.global.user?.hasRole('project_manager') ?? false }

    is_editing = input<boolean>()
    options    = input<any>()
    i          = input<number>()
    j          = input<number>()
    widget     = input<any>()
    onReload   = input<EventEmitter<any>>()

    @HostBinding('class.is-editing') get classEdit () { return this.is_editing() }

    @ContentChild(WidgetOptionsComponent) optionsComponents?:WidgetOptionsComponent
    
    ngOnInit() {
        this.reload()
    }

    ngOnChanges(a:any) {
        if ('onReload' in a) {
            this.onReload()?.subscribe(() => this.reload() )
        }
    }
    _onUpdate = ($event: any) => { 
        if (!this.isReloading) {
            this.listener.updated.emit([$event, this.i()!, this.j()!]) 
        }
    }
    onDelete = ($event: any) => this.listener.deleted.emit([$event, this.i()!, this.j()!]) 

    getI18n = () => "WIDGET"
    getOptions = () => ({ ...this.defaultOptions(), ...this.options()})
    getOptionsURI = () => {
        const m:Dictionary = {}
        const opt = this.getOptions()
        for (const key of Object.keys(opt)) {
            m[key] = opt[key].value
        }
        return m
    }
    indexExceedsSettings = (i:number) => 'max-items' in this.getOptions() && 'value' in this.getOptions()['max-items'] ? ((this.getOptions()['max-items']?.value ?? 0) <= i) : true
    badgeCount = (data:Serializable[]) => data.filter(_ => _.badge).length
}
