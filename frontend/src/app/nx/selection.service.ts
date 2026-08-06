import { Service } from '@angular/core';
import type { Serializable } from '@models/_core/serializable';

@Service()
export class SelectionService {
    #root?: Serializable;
    #context?: Serializable;

    setRoot = (root?: Serializable): void => void (this.#root = root);
    getRoot = (): Serializable | undefined => this.#root;

    setContext = (context?: Serializable): void => void (this.#context = context);
    get context(): Serializable | undefined { return this.#context; }
}
