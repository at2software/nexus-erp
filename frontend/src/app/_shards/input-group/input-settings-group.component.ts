import { GlobalService } from '@models/global.service';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Serializable } from '@models/serializable';
import { Param } from '@models/param.model';
import { NexusHttp } from '@models/http/http.nexus';
import { NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';
import { InputGroupComponent } from './input-group.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'input-settings-group',
    templateUrl: './input-settings-group.component.html',
    imports: [NgbTypeaheadModule],
})
export class InputSettingsGroupComponent extends InputGroupComponent {
    id = input.required<string>();
    parent = input<Serializable | undefined>();

    #fetchedParam = signal<Serializable | undefined>(undefined);
    effectiveObject = computed(() => this.object() ?? this.#fetchedParam());

    override get model(): string | undefined {
        return (this.effectiveObject() as unknown as Record<string, string> | undefined)?.['value'];
    }
    override set model(value: string | undefined) {
        const obj = this.effectiveObject();
        if (obj) (obj as unknown as Record<string, string | undefined>)['value'] = value;
    }
    taKey = (x: { name: string }) => x.name;

    #global = inject(GlobalService);
    #http = inject(NexusHttp);
    #requestId = 0;

    constructor() {
        super();
        this.onUpdate.pipe(takeUntilDestroyed()).subscribe(this.#global.reload);

        effect(() => {
            const id = this.id();
            const parent = this.parent();
            if (!parent) {
                void this.#loadGlobalParam(id);
                return;
            }
            const p = parent.getParam(id);
            this.#fetchedParam.set(
                Param.fromJson({ key: id, value: p !== undefined ? p : '' })
            );
        });
    }

    async #loadGlobalParam(id: string) {
        const requestId = ++this.#requestId;
        const cached = await this.#global.settingParam(id);
        if (requestId !== this.#requestId) return;
        if (cached) {
            this.#fetchedParam.set(cached);
            return;
        }
        this.#http.get('params/' + id).pipe(takeUntilDestroyed()).subscribe((_) => {
            if (requestId === this.#requestId) {
                this.#fetchedParam.set(Param.fromJson(_));
            }
        });
    }

    onKey = (event: Event) => (this.model = (event.target as HTMLInputElement).value);

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
