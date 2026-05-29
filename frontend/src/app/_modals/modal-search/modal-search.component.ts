import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ModalBaseComponent } from '../modal-base.component';
import { SearchInputComponent } from '@app/_shards/search-input/search-input.component';

@Component({
    selector: 'modal-search',
    standalone: true,
    imports: [SearchInputComponent],
    templateUrl: './modal-search.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalSearchComponent extends ModalBaseComponent<any> {
    onlyClass = '';
    label = 'select';
    #result?: any;

    init(onlyClass: string, label = 'select') {
        this.onlyClass = onlyClass;
        this.label = label;
    }

    onSuccess() {
        return this.#result;
    }

    onSelected(item: any) {
        this.#result = item;
        this.accept();
    }
}
