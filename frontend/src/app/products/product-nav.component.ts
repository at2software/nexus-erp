import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ProductTreeComponent } from './product-tree/product-tree.component';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'product-nav',
    templateUrl: './product-nav.component.html',
    imports: [ProductTreeComponent, RouterModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductNavComponent {}
