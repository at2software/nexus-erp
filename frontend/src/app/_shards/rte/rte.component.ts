import { ChangeDetectionStrategy, Component, inject, input, TemplateRef } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Serializable } from '@models/serializable';
import { DEFAULT_RTE_CONFIG } from '../text-param-editor/default-rte-config';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { AngularEditorModule } from '@kolkov/angular-editor';
import { FormsModule } from '@angular/forms';
import { SafePipe } from '@pipes/safe.pipe';
import { HotkeyDirective } from '@directives/hotkey.directive';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'rte',
    templateUrl: './rte.component.html',
    styleUrls: ['./rte.component.scss'],
    standalone: true,
    imports: [EmptyStateComponent, AngularEditorModule, FormsModule, SafePipe, HotkeyDirective],
})
export class RteComponent {
    object = input.required<Serializable>();
    key = input.required<string>();
    config = input(DEFAULT_RTE_CONFIG);
    compact = input(false);

    get binding() {
        return (this.object() as any)[this.key()];
    }
    set binding(v: any) {
        (this.object() as any)[this.key()] = v;
    }

    #doc = inject(DOCUMENT);
    modalService = inject(NgbModal);

    open(content: TemplateRef<any>) {
        const ref = this.modalService.open(content, { size: 'lg' });
        ref.shown.subscribe(() => this.#focusEditorEnd());
        ref.result.then(() => this.object().update().subscribe());
    }

    #focusEditorEnd() {
        const el = this.#doc.querySelector<HTMLElement>('.angular-editor-textarea');
        if (!el) return;
        el.focus();
        const range = this.#doc.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        const sel = this.#doc.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
    }

    onKeyDown(event: KeyboardEvent) {
        if (event.ctrlKey && event.key === 'd') {
            event.preventDefault();
            this.insertCurrentDate();
        }
    }

    insertCurrentDate() {
        const d = new Date();
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const sel = this.#doc.getSelection();
        if (!sel?.rangeCount) return;
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const node = this.#doc.createTextNode(dateStr);
        range.insertNode(node);
        range.setStartAfter(node);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        node.parentElement?.dispatchEvent(new Event('input', { bubbles: true }));
    }
}
