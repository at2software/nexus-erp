import { Dictionary } from '@constants/constants';
import { Type } from '@angular/core';
import { deepCopy } from '@constants/object/deepClone';
import { Serializable } from '@models/_core/serializable';
import { ModalBaseComponent } from './modal-base.component';

export abstract class ModalEditComponent<T extends Serializable> extends ModalBaseComponent<{ item: T }> {
    item!: T;
    #originalItem!: T;
    #new = false;
    abstract new(): Type<T>;
    abstract keys(): string[];
    init = (item: T | undefined) => {
        if (item === undefined) {
            item = new (this.new())();
            this.#new = true;
        }
        this.#originalItem = item;
        this.item = deepCopy(item);
    };
    onSuccess = () => {
        const payload: Dictionary = {};
        const item = this.item as unknown as Record<string, unknown>;
        for (const key of this.keys()) {
            payload[key] = item[key];
        }
        if (this.#new) {
            this.#originalItem.store(payload).subscribe();
        } else {
            this.#originalItem.update(payload).subscribe();
        }
        return { item: this.item };
    };
}
