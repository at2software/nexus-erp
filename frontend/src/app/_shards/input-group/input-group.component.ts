import { GlobalService } from 'src/models/global.service';
import { Component, EventEmitter, inject, input, OnChanges, OnInit } from '@angular/core';
import { Serializable } from 'src/models/serializable';
import { ToastService } from '../toast/toast.service';
import { Observable, OperatorFunction } from 'rxjs';
import { debounceTime, map } from 'rxjs/operators';
import { BaseHttpService } from 'src/models/http.service';
import { Param } from 'src/models/param.model';

import { NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
    selector: 'input-group',
    templateUrl: './input-group.component.html',
    styleUrls: ['./input-group.component.scss'],
    standalone: true,
    imports: [NgbTypeaheadModule]
})
export class InputGroupComponent implements OnChanges {

    object      = input<Serializable|undefined>();
    key         = input<string>('');
    suffix      = input<string|undefined>();
    typeahead   = input<{ key: string, name: string }[]|undefined>();
    placeholder = input<string|undefined>();

    #originalValue: any
    protected onUpdate = new EventEmitter<any>()

    protected service = inject(BaseHttpService)
    protected toast = inject(ToastService)

    ngOnChanges() {
        if (this.object()) {
            this.#originalValue = this.model
        }
    }

    // typeahead
    taValue = (x: { name: string }) => x.name
    taKey = (x: { key: string }) => x.key
    taSelect = (x: any) => this.updateModel(x.item.key)
    search: OperatorFunction<string, readonly { key: string, name: string }[]> = (text$: Observable<string>) => text$.pipe(
        debounceTime(200),
        map((x: any) => (x === '') ? [] : this.typeahead()!.filter(v => v.name.toLowerCase().indexOf(x.toLowerCase() || v.key.toLowerCase().indexOf(x.toLowerCase())) > -1).slice(0, 10))
    )

    // general
    get value() { return this.typeahead() ? this.typeahead()!.find(x => x.key == this.model)?.name : this.model }
    get model() { return (this.object() as any)[this.key()!] }
    set model(value: any) { (this.object() as any)[this.key()!] = value }

    onBlur = (event: any) => {
        this.updateModel(event.target.value)
    }
    updateModel(s: string) {
        if (s === this.#originalValue) return
        this.model = s
        this.object()?.update(this.object()?.getPrimitives()).subscribe()
    }
}

@Component({
    selector: 'input-settings-group',
    templateUrl: './input-group.component.html',
    styleUrls: ['./input-group.component.scss'],
    standalone: true,
    imports: [NgbTypeaheadModule]
})
export class InputSettingsGroupComponent extends InputGroupComponent implements OnInit, OnChanges {

    id = input.required<string>()
    parent = input<Serializable|undefined>()

    override get model() { return (this.object() as any)?.['value'] }
    override set model(value: any) { if (this.object()) (this.object() as any)['value'] = value }
    taKey = (x: any) => x.name

    #global = inject(GlobalService)

    ngOnInit() {
        this.onUpdate.subscribe(this.#global.reload)
    }

    async ngOnChanges() {
        let object = this.object()
        const parent = this.parent()
        if(!parent) {
            object = await this.#global.settingParam(this.id())
            if (!object) {
                this.service.get('params/' + this.id()).subscribe(_ => {
                    object = Param.fromJson(_)
                })
            }
        } else {
            const p = parent.getParam(this.id())
            if (p !== undefined) {
                object = Param.fromJson({key: this.id(), value: p})
            } else {
                object = Param.fromJson({key: this.id(), value: ''})
            }
        }
        super.ngOnChanges()
    }
    onKey = (event: any) => this.model = event.target.value


    updateModel(s: string) {
        const parent = this.parent()
        if(!parent){
            super.updateModel(s)
        } else {
            parent.params![this.id()] = s
            parent.updateParam(this.id(), { value: s }).subscribe()
        }
    }

}
