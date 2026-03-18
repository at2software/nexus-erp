import { NxGlobal } from "src/app/nx/nx.global"
import { ProductGroupService } from "src/models/product/product-group.service"
import { Product } from "./product.model"
import { Serializable } from "./../serializable"
import { getProductGroupActions } from "./product-group.actions"
import { Observable, map } from "rxjs"
import { AutoWrapArray } from "@constants/autowrap"

export class ProductGroup extends Serializable {

    SERVICE = ProductGroupService

    doubleClickAction: number = 0
    actions = getProductGroupActions(this)

    name      : string  = ''
    symbol    : string  = ''
    expanded  : boolean = false
    is_active : boolean = true
    color     : string  = 'ffffff'
    net       : number  = 0
    quote     : string   = ''

    @AutoWrapArray('ProductGroup') child_groups:ProductGroup[]
    @AutoWrapArray('Product') products:Product[]

    set products_min(g:any[]) { this.products = g.map(_ => Product.fromJson(_)) }

    static API_PATH = (): string => 'product_groups'
    frontendUrl = (): string => `/products/group/${this.id}`
    put = (path: string) => NxGlobal.service.put(`product_groups/${this.id}/${path}`, {}).subscribe(_ => Object.assign(this, _))

    static createWithParentId = (name:string = 'New product group', parentId:string|undefined = undefined):Observable<ProductGroup> => NxGlobal.service.post('product_groups', { name:name, product_group_id: parentId }).pipe(map(x => ProductGroup.fromJson(x)))
}