import { Injectable } from '@angular/core';
import { CdkTable } from '@angular/cdk/table';
import * as XLSX from 'xlsx';

@Injectable({
    providedIn: 'root'
})
export class TableExportService {

    exportAnyTableToCSV(table: HTMLTableElement | CdkTable<any>, filenamePrefix: string = '') {
        if (table instanceof HTMLTableElement) {
            this.#exportTableAsCsv(table, filenamePrefix);
        } else if (table instanceof CdkTable) {
            this.#exportCdkTableAsCsv(table, filenamePrefix);
        }
    }
    
    #exportTableAsCsv(table: HTMLTableElement, filenamePrefix: string = ''): void {
        if (!table) {
            console.error('Table empty');
            return;
        }

        const csvData = this.#convertTableToCsv(table);
        const ws = XLSX.utils.aoa_to_sheet(csvData)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Daten")

        const excelBuffer: any = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        const filename = this.#generateFilename(filenamePrefix);

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    #convertTableToCsv(table: HTMLTableElement): any[][] {
        const rows = Array.from(table.rows)
        const conv = (cell:any, data:any) => {
            if (('exportNumeric' in cell.dataset)) return parseFloat(data)
                return data
        }
        return rows
            .filter(row => !('exportHidden' in row.dataset))
            .map(row => {
                const cells = Array.from(row.cells);
                return cells
                    .filter(cell => !('exportHidden' in cell.dataset))
                    .map(cell => {
                        if (cell.dataset?.export) {
                            return conv(cell, cell.dataset.export)
                        }
                        return conv(cell, cell.textContent?.trim() || '')
                    })
            })
    }

    #exportCdkTableAsCsv(table: CdkTable<any>, filenamePrefix: string): void {
        if (!table || !table.dataSource) {
            console.error('CdkTable or dataSource empty');
            return;
        }

        const separator = ',';

        const columns = table._contentColumnDefs.map(columnDef => columnDef.name);
        if (columns.length === 0) {
            console.error('No columns in CdkTable');
            return;
        }

        const headers = columns.join(separator);
        let csvContent = headers + '\n';

        const data = (table.dataSource as any[]);
        data.forEach(row => {
            const rowData = columns.map(column => {
                let cell = row[column] === null || row[column] === undefined ? '' : row[column];
                cell = cell instanceof Date ? cell.toLocaleString() : cell.toString();
                //cell = cell.includes(separator) || cell.includes('"') || cell.includes('\n') ? cell.replace(/"/g, '""') : cell;
                return cell;
            });
            csvContent += rowData.join(separator) + '\n';
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        const filename = this.#generateFilename(filenamePrefix);

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    #generateFilename(filenamePrefix: string): string {
        const now = new Date();
        const formattedDate = `${now.getFullYear()}_${(now.getMonth() + 1).toString().padStart(2, '0')}_${now.getDate().toString().padStart(2, '0')}`;
        const formattedTime = `${now.getHours().toString().padStart(2, '0')}_${now.getMinutes().toString().padStart(2, '0')}_${now.getSeconds().toString().padStart(2, '0')}`;
        const dateTime = `${formattedDate}_${formattedTime}`;

        return filenamePrefix ? `${filenamePrefix}_${dateTime}` : dateTime;
    }
}
