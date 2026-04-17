import { Component, inject, input, TemplateRef } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Serializable } from 'src/models/serializable';
import { DEFAULT_RTE_CONFIG } from '../text-param-editor/default-rte-config';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { AngularEditorModule } from '@kolkov/angular-editor';
import { FormsModule } from '@angular/forms';
import { SafePipe } from 'src/pipes/safe.pipe';
import { HotkeyDirective } from '@directives/hotkey.directive';


@Component({
    selector: 'rte',
    templateUrl: './rte.component.html',
    styleUrls: ['./rte.component.scss'],
    standalone: true,
    imports: [EmptyStateComponent, AngularEditorModule, FormsModule, SafePipe, HotkeyDirective]
})
export class RteComponent {
    object  = input.required<Serializable>()
    key     = input.required<string>()
    config  = input(DEFAULT_RTE_CONFIG)
    compact = input(false)

    get binding() { return (this.object() as any)[this.key()] }
    set binding(v: any) { (this.object() as any)[this.key()] = v }

    modalService = inject(NgbModal)

    open(content: TemplateRef<any>) {
        this.modalService.open(content, { size: 'lg' }).result.then(() => this.object().update().subscribe());
    }
}
