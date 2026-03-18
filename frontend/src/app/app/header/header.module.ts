import { NgModule } from "@angular/core";
import { HeaderComponent } from "./header.component";
import { HeaderLinkItemComponent } from "./header-link-item/header-link-item.component";

const SHARED = [
    HeaderComponent, HeaderLinkItemComponent
]
@NgModule({
    imports: SHARED,
    exports: SHARED
})
export class HeaderModule { }