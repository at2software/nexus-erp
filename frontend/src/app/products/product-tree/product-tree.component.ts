import { Component, inject, OnInit } from '@angular/core';
import { ProductGroup } from 'src/models/product/product-group.model';
import { NotificationCenter } from 'src/models/notification.service';
import { ProductGroupService } from 'src/models/product/product-group.service';

import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { ProductTreeListComponent } from './product-tree-list.component';
import { Router } from '@angular/router';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { GlobalService } from '@models/global.service';
import { InputModalService } from '@app/_modals/modal-input/modal-input.component';

@Component({
    selector: 'product-tree',
    templateUrl: './product-tree.component.html',
    styleUrls: ['./product-tree.component.scss'],
    host: { class: 'sticky-side sticky-side-100 card' },
    standalone: true,
    imports: [ScrollbarComponent, ProductTreeListComponent, NgbTooltipModule]
})
export class ProductTreeComponent implements OnInit {

    groups: ProductGroup[] = []
    isLoading = false

    showDeprecated: boolean = false
    toggleDeprecated = () => this.showDeprecated = !this.showDeprecated
    global = inject(GlobalService)

    constructor(public productGroupService: ProductGroupService, private inputModalService: InputModalService, private router: Router) { }

    update = () => {
        this.isLoading = true
        this.productGroupService.index().subscribe(_ => {
            this.groups = _
            this.isLoading = false
        })
    }

    ngOnInit(): void {
        this.update()
        NotificationCenter.subscribe(['put', 'post', 'delete'], [/^products/, /^product_groups/], _ => {
            this.update()
        })
    }
    onGroupCreate = () => {
        this.inputModalService.open("name").confirmed(({ text }) => {
            ProductGroup.createWithParentId(text).subscribe(x => {
                this.router.navigate(['/products/group/' + x.id])
            })
        })
    }
}
