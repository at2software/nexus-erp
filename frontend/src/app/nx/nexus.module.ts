import { NgModule } from "@angular/core";
import { Nx } from "./nx.directive";
import { NComponent } from "@shards/n/n.component";
import { AvatarComponent } from "@shards/avatar/avatar.component";
import { ProjectComponent } from "@shards/project/project.component";

const SHARED = [
    Nx, NComponent, AvatarComponent, ProjectComponent
]
@NgModule({
    imports: SHARED,
    exports: SHARED,
})
export class NexusModule { }