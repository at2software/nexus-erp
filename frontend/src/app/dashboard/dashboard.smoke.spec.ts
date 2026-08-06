import type { Type } from '@angular/core';
import { renderComponent } from '@testing/component-test';
import { WidgetRevenueRadialComponent } from '@app/dashboard/widgets/widget-revenue-radial/widget-revenue-radial.component';

const components: [string, Type<unknown>][] = [
    ['WidgetRevenueRadialComponent', WidgetRevenueRadialComponent],
];

// Every component here loads through the Resource API. Nothing resolves under the testing
// HTTP backend, so this asserts only that the loading state renders without throwing.
describe('dashboard renders', () => {
    it.each(components)('%s', (_name, component) => {
        expect(renderComponent(component).nativeElement).toBeTruthy();
    });
});
