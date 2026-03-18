import { Component, Input } from '@angular/core';
import { SortData } from '../sort-data';
import { SortMode } from '../sort-mode';




@Component({
    selector: 'table-header-sort-button',
    templateUrl: './table-header-sort-button.component.html',
    styleUrls: ['./table-header-sort-button.component.scss'],
    standalone: true
})
export class TableHeaderSortButtonComponent {

	@Input() key:string|undefined
	@Input() sortData:SortData|undefined

	public get icon():string{
		if(this.key == this.sortData?.key){
			switch (this.sortData?.sortMode) {
				case SortMode.ASCENDING:
					return "arrow_upward"
				case SortMode.DESCENDING:
					return "arrow_downward"
				default:
					return "sort"
			}
		}else{
			return "sort"
		}
	}

	public onClick(event:MouseEvent):void {
		event.preventDefault()
		if(!this.sortData || !this.key) return
		this.sortData.key = this.key
		switch (this.sortData.sortMode) {
			case SortMode.ASCENDING:
				this.sortData.sortMode = SortMode.DESCENDING
				break
			case SortMode.DESCENDING:
				this.sortData.sortMode = SortMode.NONE
				break
			default:
				this.sortData.sortMode = SortMode.ASCENDING
				break
		}
	}

}
