import { CdkTable } from '@angular/cdk/table';
import { Directive, ElementRef, effect, inject, input } from '@angular/core';
import { TableExportService } from '@models/table-export.service';

@Directive({
    selector: '[enableTableExport]',
})
export class EnableTableExportDirective {
    filenamePrefix = input.required<string>();

    #el: ElementRef = inject(ElementRef);
    #tableExportService: TableExportService = inject(TableExportService);
    #initialized = false;

    constructor() {
        effect(() => {
            this.filenamePrefix();
            if (this.#initialized) return;

            const host = this.#el.nativeElement as HTMLElement;
            const table = host as HTMLTableElement | CdkTable<unknown>;

            const button = document.createElement('button');
            button.type = 'button';
            button.innerText = 'excel';
            button.style.fontFamily = 'NxIcons';
            button.classList.add('btn', 'btn-table-export', 'pointer');
            button.title = 'Export to Excel';
            button.onclick = () => this.#tableExportService.exportAnyTableToCSV(table, this.filenamePrefix());

            const card = host.closest('.card');
            let header = card?.querySelector(':scope > .card-header') as HTMLElement | null;
            if (card && !header) {
                header = document.createElement('div');
                header.classList.add('card-header');
                card.insertBefore(header, card.firstChild);
            }

            if (header) {
                header.classList.add('d-flex', 'align-items-center');
                if (header.childNodes.length) {
                    const label = document.createElement('span');
                    label.classList.add('flex-fill', 'text-truncate');
                    while (header.firstChild) label.appendChild(header.firstChild);
                    header.appendChild(label);
                }
                button.classList.add('ms-auto');
                header.appendChild(button);
            } else {
                host.appendChild(button);
            }

            this.#initialized = true;
        });
    }
}
