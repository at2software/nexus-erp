import { ChangeDetectionStrategy, Component, effect, EventEmitter, inject, input, untracked } from '@angular/core';
import { Serializable } from '@models/serializable';
import { ToastService } from '../toast/toast.service';
import { Observable, OperatorFunction } from 'rxjs';
import { debounceTime, map } from 'rxjs/operators';
import { NexusHttpService } from '@models/http/http.nexus';

import { NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'input-group',
    templateUrl: './input-group.component.html',
    styleUrls: ['./input-group.component.scss'],
    standalone: true,
    imports: [NgbTypeaheadModule],
})
export class InputGroupComponent {
    object = input<Serializable | undefined>();
    key = input<string>('');
    suffix = input<string | undefined>();
    typeahead = input<{ key: string; name: string }[] | undefined>();
    placeholder = input<string | undefined>();

    #originalValue: any;
    protected onUpdate = new EventEmitter<any>();

    protected service = inject(NexusHttpService);
    protected toast = inject(ToastService);

    constructor() {
        effect(() => {
            if (this.object())
                untracked(() => {
                    this.#originalValue = this.model;
                });
        });
    }

    // typeahead
    taValue = (x: { name: string }) => x.name;
    taKey = (x: { key: string }) => x.key;
    taSelect = (x: any) => this.updateModel(x.item.key);
    search: OperatorFunction<string, readonly { key: string; name: string }[]> = (text$: Observable<string>) =>
        text$.pipe(
            debounceTime(200),
            map((x: any) =>
                x === ''
                    ? []
                    : this.typeahead()!
                          .filter((v) => v.name.toLowerCase().indexOf(x.toLowerCase() || v.key.toLowerCase().indexOf(x.toLowerCase())) > -1)
                          .slice(0, 10),
            ),
        );

    // general
    get value() {
        return this.typeahead() ? this.typeahead()!.find((x) => x.key == this.model)?.name : this.model;
    }
    get model() {
        return (this.object() as any)[this.key()!];
    }
    set model(value: any) {
        (this.object() as any)[this.key()!] = value;
    }

    onBlur = (event: any) => {
        this.updateModel(event.target.value);
    };
    updateModel(s: string) {
        if (s === this.#originalValue) return;
        this.model = s;
        this.object()?.update(this.object()?.toPayload()).subscribe();
    }
}
