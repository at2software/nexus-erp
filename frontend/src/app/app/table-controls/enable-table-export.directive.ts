// export-table.directive.ts
import { CdkTable } from '@angular/cdk/table';
import { Directive, ElementRef, inject, input, OnInit } from '@angular/core';
import { TableExportService } from 'src/models/table-export.service';

@Directive({
    selector: '[enableTableExport]',
    standalone: true
})
export class EnableTableExportDirective implements OnInit {
    
    filenamePrefix = input.required<string>();

    #el: ElementRef = inject(ElementRef)
    #tableExportService: TableExportService = inject(TableExportService)

    ngOnInit() {
        const button = document.createElement('button');
        button.innerText = 'file_download';
        button.style.fontFamily = 'Material Icons Sharp';
        button.setAttribute('ngbTooltip', "export to Excel");
        button.classList.add('btn');
        button.classList.add('btn-table-export-flap');
        button.classList.add('pointer');
        button.classList.add('export-button');
        const table = this.#el.nativeElement as HTMLTableElement | CdkTable<any>;
        button.onclick = () => this.#tableExportService.exportAnyTableToCSV(table, this.filenamePrefix());
        this.#el.nativeElement.appendChild(button);
    }
}
