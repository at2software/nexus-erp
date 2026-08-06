import type { Type } from '@angular/core';
import { renderComponent } from '@testing/component-test';
import { ProductOverviewComponent } from '@app/products/-/product-overview/product-overview.component';
import { ProductStatisticsComponent } from '@app/products/-/product-statistics/product-statistics.component';
import { ProductDetailOverviewComponent } from '@app/products/product-detail/product-detail-overview/product-detail-overview.component';
import { ProductRefactorComponent } from '@app/products/product-detail/product-split/product-split.component';
import { ProductGroupOverviewComponent } from '@app/products/product-group/product-group-overview/product-group-overview.component';
import { ProductTreeComponent } from '@app/products/product-tree/product-tree.component';

const components: [string, Type<unknown>][] = [
    ['ProductOverviewComponent', ProductOverviewComponent],
    ['ProductStatisticsComponent', ProductStatisticsComponent],
    ['ProductDetailOverviewComponent', ProductDetailOverviewComponent],
    ['ProductRefactorComponent', ProductRefactorComponent],
    ['ProductGroupOverviewComponent', ProductGroupOverviewComponent],
    ['ProductTreeComponent', ProductTreeComponent],
];

// Every component here loads through the Resource API. Nothing resolves under the testing
// HTTP backend, so this asserts only that the loading state renders without throwing.
describe('products renders', () => {
    it.each(components)('%s', (_name, component) => {
        expect(renderComponent(component).nativeElement).toBeTruthy();
    });
});
