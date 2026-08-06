import type { Type } from '@angular/core';
import { renderComponent } from '@testing/component-test';
import { ModalSelectInvoiceItemComponent } from '@app/_modals/modal-select-invoice-item/modal-select-invoice-item.component';

const components: [string, Type<unknown>][] = [
    ['ModalSelectInvoiceItemComponent', ModalSelectInvoiceItemComponent],
];

// Every component here loads through the Resource API. Nothing resolves under the testing
// HTTP backend, so this asserts only that the loading state renders without throwing.
describe('modals renders', () => {
    it.each(components)('%s', (_name, component) => {
        expect(renderComponent(component).nativeElement).toBeTruthy();
    });
});
