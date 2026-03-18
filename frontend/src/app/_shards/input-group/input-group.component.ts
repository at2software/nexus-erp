import { GlobalService } from 'src/models/global.service';
import { Component, EventEmitter, inject, Input, OnChanges, OnInit } from '@angular/core';
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

    @Input() object?: Serializable
    @Input() key: string
    @Input() suffix?: string
    @Input() typeahead?: { key: string, name: string }[]
    @Input() placeholder: string = ''

    #originalValue: any
    protected onUpdate = new EventEmitter<any>()

    protected service = inject(BaseHttpService)
    protected toast = inject(ToastService)

    ngOnChanges() {
        if (this.object) {
            this.#originalValue = this.model
        }
    }

    // typeahead
    taValue = (x: { name: string }) => x.name
    taKey = (x: { key: string }) => x.key
    taSelect = (x: any) => this.updateModel(x.item.key)
    search: OperatorFunction<string, readonly { key: string, name: string }[]> = (text$: Observable<string>) => text$.pipe(
        debounceTime(200),
        map((x: any) => (x === '') ? [] : this.typeahead!.filter(v => v.name.toLowerCase().indexOf(x.toLowerCase() || v.key.toLowerCase().indexOf(x.toLowerCase())) > -1).slice(0, 10))
    )

    // general
    get value() { return this.typeahead ? this.typeahead.find(x => x.key == this.model)?.name : this.model }
    get model() { return (this.object as any)[this.key] }
    set model(value: any) { (this.object as any)[this.key] = value }

    onBlur = (event: any) => {
        this.updateModel(event.target.value)
    }
    updateModel(s: string) {
        if (s === this.#originalValue) return
        this.model = s
        this.object?.update(this.object.getPrimitives()).subscribe()
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

    @Input() id: string
    @Input() parent?: Serializable

    key = 'value'
    taKey = (x: any) => x.name

    #global = inject(GlobalService)

    ngOnInit() {
        this.onUpdate.subscribe(this.#global.reload)
    }

    async ngOnChanges() {
        if(!this.parent){
            this.object = await this.#global.settingParam(this.id)
            if (!this.object) {
                this.service.get('params/' + this.id).subscribe(_ => {
                    this.object = Param.fromJson(_)
                })
            }
        } else {
            const p = this.parent.getParam(this.id)
            if (p !== undefined) {
                this.object = Param.fromJson({key: this.id, value: p})
            } else {
                this.object = Param.fromJson({key: this.id, value: ''})
            }
        }
        super.ngOnChanges()
    }
    onKey = (event: any) => this.model = event.target.value


    updateModel(s: string) {
        if(!this.parent){
            super.updateModel(s)
        } else {
            this.parent.params![this.id] = s
            this.parent.updateParam(this.id, { value: s }).subscribe()
        }
    }

}
