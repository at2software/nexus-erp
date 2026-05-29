import { Router } from '@angular/router';
import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { SearchInputComponent } from '@shards/search-input/search-input.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-search',
    templateUrl: './search.component.html',
    styleUrls: ['./search.component.scss'],
    standalone: true,
    imports: [SearchInputComponent],
    host: {
        class: 'd-flex align-items-center',
        '(document:click)': 'onDocumentClick($event)',
    },
})
export class SearchComponent {
    
    #router = inject(Router);
    #eRef = inject(ElementRef);

    searchbox = viewChild.required(SearchInputComponent);
    expanded = signal(false);

    onDocumentClick(event: MouseEvent) {
        if (!this.#eRef.nativeElement.contains(event.target)) {
            this.expanded.set(false);
        }
    }

    toggleSearchBox() {
        this.expanded.update((v) => !v);
        if (this.expanded()) {
            this.searchbox().query.set('');
            setTimeout(() => this.searchbox().focus(), 50);
        }
    }

    onSelect(e: any) {
        this.searchbox().blur();
        this.searchbox().empty();
        this.expanded.set(false);
        this.#router.navigate([this.#pathFor(e)]);
    }

    #pathFor(o: any) {
        switch (o.class) {
            case 'Company': return '/customers/' + o.id;
            case 'CompanyContact': return '/customers/' + o.company_id;
            case 'Project': return '/projects/' + o.id;
            case 'Product': return '/products/' + o.id;
            case 'Invoice': return '/financial/' + o.id;
        }
        return '/';
    }
}
