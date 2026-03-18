import { Component, inject, Input, TemplateRef } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Serializable } from 'src/models/serializable';
import { DEFAULT_RTE_CONFIG } from '../text-param-editor/default-rte-config';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { AngularEditorModule } from '@kolkov/angular-editor';
import { FormsModule } from '@angular/forms';
import { SafePipe } from 'src/pipes/safe.pipe';


@Component({
    selector: 'rte',
    templateUrl: './rte.component.html',
    styleUrls: ['./rte.component.scss'],
    standalone: true,
    imports: [EmptyStateComponent, AngularEditorModule, FormsModule, SafePipe]
})
export class RteComponent {
    @Input() object: Serializable
    @Input() key: string
    @Input() config = DEFAULT_RTE_CONFIG
    @Input() compact: boolean = false

    get binding() { return (this.object as any)[this.key] }
    set binding(_: any) { (this.object as any)[this.key] = _ }

    modalService = inject(NgbModal)

    open(content: TemplateRef<any>) {
        this.modalService.open(content, { size: 'lg' }).result.then(() => this.object.update().subscribe());
    }
}
