import { Type } from "@angular/core"
import { deepCopy } from "src/constants/deepClone"
import { Serializable } from "src/models/serializable"
import { ModalBaseComponent } from "./modal-base.component"

/**
 * Abstract class of a modal popup that allows editing of any serializable item
 * Changes should be mapped directly via [(ngModel)] to the item
 * Modal will be triggered via ModalBaseService.open([ModalComponent], item)
 * @argument item can either be of type T or `undefined` - undefined creating a new record on save instead of updating
 */
export abstract class ModalEditComponent<T extends Serializable> extends ModalBaseComponent<{item: T}> {    
    item:T
    #originalItem:T
    #new = false
    abstract new():Type<T>
    abstract keys():string[]
    init = (item: T|undefined) => { 
        if (item === undefined) {
            item = new (this.new())()
            this.#new = true
        }
        this.#originalItem = item
        this.item = deepCopy(item)
    }
    onSuccess = () => { 
        const payload:Record<string, any> = {}
        for (const key of this.keys()) {
            payload[key] = (this.item as any)[key]
        }
        if (this.#new) {
            this.#originalItem.store(payload).subscribe()
        } else {
            this.#originalItem.update(payload).subscribe()
        }
        return { item: this.item }
    }
}