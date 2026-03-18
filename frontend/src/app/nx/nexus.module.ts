import { NgModule } from "@angular/core";
import { Nx } from "./nx.directive";
import { NxForDirective } from "./nxFor.directive";
import { NComponent } from "@shards/n/n.component";
import { AvatarComponent } from "@shards/avatar/avatar.component";
import { ProjectComponent } from "@shards/project/project.component";

const SHARED = [
    Nx, NxForDirective, NComponent, AvatarComponent, ProjectComponent
]
@NgModule({
    imports: SHARED,
    exports: SHARED,
})
export class NexusModule { }