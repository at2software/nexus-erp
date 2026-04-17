import { Component, input } from '@angular/core';
import { SortData } from '../sort-data';
import { SortMode } from '../sort-mode';

@Component({
    selector: 'table-header-sort-button',
    templateUrl: './table-header-sort-button.component.html',
    styleUrls: ['./table-header-sort-button.component.scss'],
    standalone: true
})
export class TableHeaderSortButtonComponent {

    key      = input<string>()
    sortData = input<SortData>()

    public get icon(): string {
        if (this.key() == this.sortData()?.key) {
            switch (this.sortData()?.sortMode) {
                case SortMode.ASCENDING:  return 'arrow_upward'
                case SortMode.DESCENDING: return 'arrow_downward'
                default:                  return 'sort'
            }
        }
        return 'sort'
    }

    public onClick(event: MouseEvent): void {
        event.preventDefault()
        if (!this.sortData() || !this.key()) return
        const sd = this.sortData()!
        sd.key = this.key()!
        switch (sd.sortMode) {
            case SortMode.ASCENDING:  sd.sortMode = SortMode.DESCENDING; break
            case SortMode.DESCENDING: sd.sortMode = SortMode.NONE;       break
            default:                  sd.sortMode = SortMode.ASCENDING;  break
        }
    }
}
