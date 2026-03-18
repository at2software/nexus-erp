import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MantisPlugin } from '@models/http/plugin.mantis';
import { User } from '@models/user/user.model';
import { ModalBaseComponent } from '@app/_modals/modal-base.component';

@Component({
    selector: 'mantis-user-selection',
    templateUrl: './mantis-user-selection.component.html',
    styleUrls: ['./mantis-user-selection.component.scss'],
    standalone: true,
    imports: [FormsModule, CommonModule]
})
export class MantisUserSelectionComponent extends ModalBaseComponent<string> {

  mantisPlugin: MantisPlugin
  selectedUserId: string
  searchTerm: string = ''

  init(_: MantisPlugin): void {
    this.mantisPlugin = _
  }

  onSuccess = () => this.selectedUserId

  isRootInstance = (): boolean => this.mantisPlugin?.isRootInstance() ?? false

  getMantisUsers = (): User[] => {
    const users = this.mantisPlugin?.getUsers() || []
    let filteredUsers = users
    if (this.searchTerm) {
      filteredUsers = users.filter((u: User) =>
        u.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        u.var?.data?.email?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        u.var?.data?.real_name?.toLowerCase().includes(this.searchTerm.toLowerCase())
      )
    }
    return filteredUsers.sort((a, b) => a.name.localeCompare(b.name))
  }

  selectUser = (userId: string) => {
    this.selectedUserId = userId
  }

  isSelected = (userId: string) => this.selectedUserId === userId
}
