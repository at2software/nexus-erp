import { AfterViewInit, Component, input, viewChild, ElementRef } from '@angular/core';
import { TableHeaderComponent } from '../table-header/table-header.component';
import { SearchData } from '../search-data';
import { TableHeaderSortButtonComponent } from '../table-header-sort-button/table-header-sort-button.component';


@Component({
    selector: 'table-header-search',
    templateUrl: './table-header-search.component.html',
    styleUrls: [
        '../table-header/table-header.component.scss',
        './table-header-search.component.scss'
    ],
    standalone: true,
    imports: [TableHeaderSortButtonComponent]
})
export class TableHeaderSearchComponent extends TableHeaderComponent implements AfterViewInit {

  searchInput     = viewChild<ElementRef>('searchInput')
  searchData      = input<SearchData>()
  clearSearchEvent = input<any>()

  ngAfterViewInit(): void {
    this.subscribe(this.clearSearchEvent(), () => {
      if (!this.searchData()) return
      if (!this.searchInput()) return
      this.searchData()!.searchString = undefined
      this.searchInput()!.nativeElement.value = ''
    })
  }

  public onInputSelect(): void {
    if (!this.key()) return
    if (!this.searchData()) return
    this.searchData()!.key = this.key()!
    this.clearSearchEvent()?.emit()
  }

  public onInputChange(): void {
    if (!this.searchData()) return
    this.searchData()!.searchString = this.searchInput()?.nativeElement.value
  }
}
