
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MantisPlugin } from '@models/http/plugin.mantis';
import { ModalBaseComponent } from '@app/_modals/modal-base.component';

@Component({
    selector: 'mantis-target-version-selection',
    templateUrl: './mantis-target-version-selection.component.html',
    styleUrls: ['./mantis-target-version-selection.component.scss'],
    standalone: true,
    imports: [FormsModule]
})
export class MantisTargetVersionSelectionComponent extends ModalBaseComponent<void> {

  id:string
  instance:MantisPlugin

  init(_:MantisPlugin): void {
    this.instance = _
    this.instance.indexTasks().subscribe()
  }
  onSuccess() {
    // nothing to do
  }
  getMantisTargetVersions = () => []

}
