import { ChangeDetectionStrategy, Component, ElementRef, computed, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HotkeyDirective } from '@directives/hotkey.directive';
import { ModalBaseComponent } from '../modal-base.component';
import { CombineDebriefItemsResult } from '@models/_core/modal-results';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'modal-combine-debrief-items',
    templateUrl: './modal-combine-debrief-items.component.html',
    imports: [FormsModule, HotkeyDirective],
})
export class ModalCombineDebriefItemsComponent extends ModalBaseComponent<CombineDebriefItemsResult> {
    protected customInput = viewChild<ElementRef>('customInput');

    items = signal<{ id: string; title: string }[]>([]);
    selectedTitle = signal('');
    useCustom = signal(false);
    customTitle = signal('');
    finalTitle = computed(() => this.useCustom() ? this.customTitle() : this.selectedTitle());

    init(items: { id: string; title: string }[]) {
        this.items.set(items);
        if (items.length > 0) this.selectedTitle.set(items[0].title);
    }

    onSuccess(): CombineDebriefItemsResult {
        return { title: this.finalTitle() };
    }

    selectTitle(title: string) {
        this.useCustom.set(false);
        this.selectedTitle.set(title);
    }

    enableCustom() {
        this.useCustom.set(true);
        this.customTitle.set('');
        setTimeout(() => this.customInput()?.nativeElement?.focus(), 0);
    }
}
