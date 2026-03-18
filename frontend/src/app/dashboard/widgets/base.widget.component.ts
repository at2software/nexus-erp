import { Component, ContentChild, EventEmitter, HostBinding, inject, Input, OnChanges, OnInit } from "@angular/core";
import { OptionType, WidgetOptionsComponent } from "./widget-options/widget-options.component";
import { Dictionary } from "src/constants/constants";
import { Serializable } from "src/models/serializable";
import { BaseWidgetListener } from "./base.widget.listener";
import { GlobalService } from "src/models/global.service";

export type TOptions = Record<string, {type:OptionType, value:any, i18n?:string}>;
@Component({
    template: '',
    standalone: true
})
export abstract class BaseWidgetComponent implements OnChanges, OnInit {
    
    defaultOptions : ()=>TOptions = () => ({
        // can be overwritten by child components
    })
    reload():void {
        // can be overwritten by child components
    }

    protected listener = inject(BaseWidgetListener)
    protected global = inject(GlobalService)
    protected isReloading:boolean = false

    value?:number = undefined
    
    // Public permission properties computed once on init for template access
    hasInvoicesModule: boolean = false
    hasInvoicesValues: boolean = false  
    hasInvoicesExpenses: boolean = false
    hasSettingsModule: boolean = false
    hasCrudProjectUpdate: boolean = false
    
    @Input() is_editing:boolean
    @Input() options:any
    @Input() i:number
    @Input() j:number
    @Input() widget:any
    @Input() onReload:EventEmitter<any>

    @HostBinding('class.is-editing') get classEdit () { return this.is_editing }

    @ContentChild(WidgetOptionsComponent) optionsComponents?:WidgetOptionsComponent
    
    ngOnInit() {
        // Compute permissions once for template access
        this.hasInvoicesModule = this.global.user?.hasRole('invoicing') ?? false
        this.hasInvoicesValues = this.global.user?.hasRole('financial') ?? false
        this.hasInvoicesExpenses = this.global.user?.hasRole('financial') ?? false
        this.hasSettingsModule = this.global.user?.hasRole('admin') ?? false
        this.hasCrudProjectUpdate = this.global.user?.hasRole('project_manager') ?? false
    }
    
    ngOnChanges(a:any) {
        if ('onReload' in a) {
            this.onReload?.subscribe(() => this.reload() )
        }
    }
    _onUpdate = ($event: any) => { 
        if (!this.isReloading) {
            this.listener.updated.emit([$event, this.i, this.j]) 
        }
    }
    onDelete = ($event: any) => this.listener.deleted.emit([$event, this.i, this.j]) 

    getI18n = () => "WIDGET"
    getOptions = () => ({ ...this.defaultOptions(), ...this.options})
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
