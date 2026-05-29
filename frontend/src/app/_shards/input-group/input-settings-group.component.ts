import { GlobalService } from '@models/global.service';
import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, OnChanges, signal } from '@angular/core';
import { Serializable } from '@models/serializable';
import { Param } from '@models/param.model';
import { NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';
import { InputGroupComponent } from './input-group.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'input-settings-group',
    templateUrl: './input-settings-group.component.html',
    styleUrls: ['./input-group.component.scss'],
    standalone: true,
    imports: [NgbTypeaheadModule],
})
export class InputSettingsGroupComponent extends InputGroupComponent implements OnInit, OnChanges {
    id = input.required<string>();
    parent = input<Serializable | undefined>();

    #fetchedParam = signal<Serializable | undefined>(undefined);
    effectiveObject = computed(() => this.object() ?? this.#fetchedParam());

    override get model() {
        return (this.effectiveObject() as any)?.['value'];
    }
    override set model(value: any) {
        const obj = this.effectiveObject();
        if (obj) (obj as any)['value'] = value;
    }
    taKey = (x: any) => x.name;

    #global = inject(GlobalService);

    ngOnInit() {
        this.onUpdate.subscribe(this.#global.reload);
    }

    async ngOnChanges() {
        const parent = this.parent();
        if (!parent) {
            const cached = await this.#global.settingParam(this.id());
            if (cached) {
                this.#fetchedParam.set(cached);
            } else {
                this.service.get('params/' + this.id()).subscribe((_) => {
                    this.#fetchedParam.set(Param.fromJson(_));
                });
            }
        } else {
            const p = parent.getParam(this.id());
            this.#fetchedParam.set(
                Param.fromJson({ key: this.id(), value: p !== undefined ? p : '' })
            );
        }
    }

    onKey = (event: any) => (this.model = event.target.value);

    override updateModel(s: string) {
        const parent = this.parent();
        if (!parent) {
            this.model = s;
            this.effectiveObject()?.update(this.effectiveObject()?.toPayload()).subscribe();
            this.onUpdate.emit(s);
        } else {
            parent.params![this.id()] = s;
            parent.updateParam(this.id(), { value: s }).subscribe();
        }
    }
}
