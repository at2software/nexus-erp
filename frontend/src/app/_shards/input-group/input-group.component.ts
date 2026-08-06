import { ChangeDetectionStrategy, Component, effect, EventEmitter, inject, input, untracked } from '@angular/core';
import { Serializable } from '@models/_core/serializable';
import { ToastService } from '../toast/toast.service';
import { Observable, OperatorFunction } from 'rxjs';
import { debounceTime, map } from 'rxjs/operators';

import { NgbTypeaheadModule, NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'input-group',
    templateUrl: './input-group.component.html',
    imports: [NgbTypeaheadModule],
})
export class InputGroupComponent {
    object = input<Serializable | undefined>();
    key = input<string>('');
    suffix = input<string | undefined>();
    typeahead = input<{ key: string; name: string }[] | undefined>();
    placeholder = input<string | undefined>();

    #originalValue: string | undefined;
    protected onUpdate = new EventEmitter<string>();

    protected toast = inject(ToastService);

    constructor() {
        effect(() => {
            if (this.object())
                untracked(() => {
                    this.#originalValue = this.model;
                });
        });
    }

    taValue = (x: { name: string }) => x.name;
    taKey = (x: { key: string; name: string }) => x.key;
    taSelect = (x: NgbTypeaheadSelectItemEvent<{ key: string; name: string }>) => this.updateModel(x.item.key);
    search: OperatorFunction<string, readonly { key: string; name: string }[]> = (text$: Observable<string>) =>
        text$.pipe(
            debounceTime(200),
            map((x) =>
                x === ''
                    ? []
                    : this.typeahead()!
                          .filter((v) => v.name.toLowerCase().indexOf((x.toLowerCase() || v.key.toLowerCase().indexOf(x.toLowerCase())) as string) > -1)
                          .slice(0, 10),
            ),
        );

    get value() {
        return this.typeahead() ? this.typeahead()!.find((x) => x.key == this.model)?.name : this.model;
    }
    get model(): string | undefined {
        return (this.object() as unknown as Record<string, string> | undefined)?.[this.key()!];
    }
    set model(value: string | undefined) {
        if (this.object()) (this.object() as unknown as Record<string, string | undefined>)[this.key()!] = value;
    }

    onBlur = (event: Event) => {
        this.updateModel((event.target as HTMLInputElement).value);
    };
    updateModel(s: string) {
        if (s === this.#originalValue) return;
        this.model = s;
        this.object()?.update(this.object()?.toPayload()).subscribe();
    }
}
