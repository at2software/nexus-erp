import { Router } from '@angular/router';
import { Component, ViewChild, HostListener, ElementRef, inject } from '@angular/core';
import { SearchInputComponent } from 'src/app/_shards/search-input/search-input.component';

@Component({
    selector: 'app-search',
    templateUrl: './search.component.html',
    styleUrls: ['./search.component.scss'],
    host: { class: 'd-flex align-items-center' },
    standalone: true,
    imports: [SearchInputComponent]
})
export class SearchComponent {

    expanded: boolean = false

    #router: Router = inject(Router)
    #eRef: ElementRef = inject(ElementRef)

    @ViewChild(SearchInputComponent) searchbox: any

    @HostListener('document:click', ['$event']) clickout(event: MouseEvent) {
        if (!this.#eRef.nativeElement.contains(event.target)) {
            this.expanded = false
        }
    }

    toggleSearchBox() {
        this.expanded = !this.expanded;
        if (this.expanded) {
            this.searchbox.query = ''
            setTimeout(() => this.searchbox.focus(), 50)
        }
    }

    pathFor(o: any) {
        switch (o.class) {
            case 'Company': return '/customers/' + o.id
            case 'CompanyContact': return '/customers/' + o.company_id
            case 'Project': return '/projects/' + o.id
            case 'Product': return '/products/' + o.id
            case 'Invoice': return '/invoices/' + o.id
        }
        return '/'
    }
    onSelect(e: any) {
        this.searchbox.blur()
        this.searchbox.empty()
        this.expanded = false
        this.#router.navigate([this.pathFor(e)])
    }

}
