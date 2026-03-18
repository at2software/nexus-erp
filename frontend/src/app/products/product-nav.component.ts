import { Component } from '@angular/core';
import { ProductTreeComponent } from './product-tree/product-tree.component';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'product-nav',
    templateUrl: './product-nav.component.html',
    styleUrls: ['./product-nav.component.scss'],
    standalone: true,
    imports: [ProductTreeComponent, RouterModule]
})
export class ProductNavComponent {
}
