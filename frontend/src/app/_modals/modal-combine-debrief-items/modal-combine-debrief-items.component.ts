import { Component, ElementRef, ViewChild } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { HotkeyDirective } from '@directives/hotkey.directive'
import { ModalBaseComponent } from '../modal-base.component'

export interface CombineDebriefItemsResult {
    title: string
}

@Component({
    selector: 'modal-combine-debrief-items',
    templateUrl: './modal-combine-debrief-items.component.html',
    standalone: true,
    imports: [FormsModule, HotkeyDirective]
})
export class ModalCombineDebriefItemsComponent extends ModalBaseComponent<CombineDebriefItemsResult> {
    @ViewChild('customInput') customInput: ElementRef

    items: { id: string, title: string }[] = []
    selectedTitle: string = ''
    useCustom: boolean = false
    customTitle: string = ''

    init(items: { id: string, title: string }[]) {
        this.items = items
        if (items.length > 0) this.selectedTitle = items[0].title
    }

    onSuccess(): CombineDebriefItemsResult {
        return { title: this.useCustom ? this.customTitle : this.selectedTitle }
    }

    selectTitle(title: string) {
        this.useCustom = false
        this.selectedTitle = title
    }

    enableCustom() {
        this.useCustom = true
        this.customTitle = ''
        setTimeout(() => this.customInput?.nativeElement?.focus(), 0)
    }

    get finalTitle(): string {
        return this.useCustom ? this.customTitle : this.selectedTitle
    }
}
