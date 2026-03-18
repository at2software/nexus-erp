
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MantisPlugin } from '@models/http/plugin.mantis';
import { ModalBaseComponent } from '@app/_modals/modal-base.component';

@Component({
    selector: 'mantis-project-selection',
    templateUrl: './mantis-project-selection.component.html',
    styleUrls: ['./mantis-project-selection.component.scss'],
    standalone: true,
    imports: [FormsModule, CommonModule]
})
export class MantisProjectSelectionComponent extends ModalBaseComponent<string> {

  mantisPlugin: MantisPlugin
  id: string
  searchTerm: string = ''

  init(_: MantisPlugin): void {
    this.mantisPlugin = _
  }

  onSuccess = () => this.id

  getMantisProjects = () => {
    const projects = this.mantisPlugin?.projects || []
    if (!this.searchTerm) return projects
    return projects.filter((p: any) =>
      p.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      p.description?.toLowerCase().includes(this.searchTerm.toLowerCase())
    )
  }

  selectProject = (projectId: string) => {
    this.id = projectId
  }

  isSelected = (projectId: string) => this.id === projectId

}
