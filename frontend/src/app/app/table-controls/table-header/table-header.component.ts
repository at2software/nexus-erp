import { Component, Input } from '@angular/core';
import { SortData } from '../sort-data';
import { BaseComponent } from '../base/base.component';
import { TableHeaderSortButtonComponent } from '../table-header-sort-button/table-header-sort-button.component';



@Component({
    selector: 'table-header2',
    templateUrl: './table-header.component.html',
    styleUrls: ['./table-header.component.scss'],
    standalone: true,
    imports: [TableHeaderSortButtonComponent]
})
export class TableHeaderComponent extends BaseComponent {

  @Input() text:string|undefined
  @Input() key:string|undefined
  @Input() sortData:SortData|undefined
  @Input() showSortButton:boolean = true

}
