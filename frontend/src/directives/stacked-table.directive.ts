import { DestroyRef, Directive, ElementRef, afterNextRender, inject } from '@angular/core';

const SORT_GLYPHS = /[↑↓⇅]/g;

@Directive({
    selector: 'table[stackedTable]',
    host: { class: 'stacked-table' },
})
export class StackedTableDirective {
    readonly #el = inject<ElementRef<HTMLTableElement>>(ElementRef);
    #signature = '';
    #queued = false;

    constructor() {
        const observer = new MutationObserver(() => this.#schedule());

        afterNextRender(() => {
            this.#syncLabels();
            observer.observe(this.#el.nativeElement, { childList: true, subtree: true });
        });

        inject(DestroyRef).onDestroy(() => observer.disconnect());
    }

    #schedule(): void {
        if (this.#queued) return;
        this.#queued = true;
        queueMicrotask(() => {
            this.#queued = false;
            this.#syncLabels();
        });
    }

    #syncLabels(): void {
        const table = this.#el.nativeElement;
        const headers = [...table.querySelectorAll<HTMLTableCellElement>(':scope > thead > tr:first-child > th')];
        if (!headers.length) return;

        const labels = headers.map(_ => {
            const text = (_.textContent ?? '').replace(SORT_GLYPHS, '').trim();
            return text.length > 1 ? text : '';
        });
        const rows = table.querySelectorAll<HTMLTableRowElement>(':scope > tbody > tr');
        const signature = `${rows.length}:${labels.join('|')}`;
        if (signature === this.#signature) return;
        this.#signature = signature;

        for (const row of rows) {
            row.querySelectorAll<HTMLTableCellElement>(':scope > td').forEach((cell, i) => {
                const label = labels[i];
                if (label) cell.setAttribute('data-label', label);
                else cell.removeAttribute('data-label');
            });
        }
    }
}
