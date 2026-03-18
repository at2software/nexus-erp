import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MattermostPlugin } from '@models/http/plugin.mattermost';
import { User } from '@models/user/user.model';
import { ModalBaseComponent } from '@app/_modals/modal-base.component';

@Component({
    selector: 'mattermost-user-selection',
    templateUrl: './mattermost-user-selection.component.html',
    styleUrls: ['./mattermost-user-selection.component.scss'],
    standalone: true,
    imports: [FormsModule, CommonModule]
})
export class MattermostUserSelectionComponent extends ModalBaseComponent<string> {

  mattermostPlugin: MattermostPlugin
  selectedUserId: string
  searchTerm: string = ''

  init(_: MattermostPlugin): void {
    this.mattermostPlugin = _
  }

  onSuccess = () => this.selectedUserId

  isRootInstance = (): boolean => this.mattermostPlugin?.isRootInstance() ?? false

  getMattermostUsers = (): User[] => {
    const users = this.mattermostPlugin?.getUsers() || []
    let filteredUsers = users
    if (this.searchTerm) {
      filteredUsers = users.filter((u: User) =>
        u.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        u.var?.data?.username?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        u.var?.data?.email?.toLowerCase().includes(this.searchTerm.toLowerCase())
      )
    }
    return filteredUsers.sort((a, b) => a.name.localeCompare(b.name))
  }

  selectUser = (userId: string) => {
    this.selectedUserId = userId
  }

  isSelected = (userId: string) => this.selectedUserId === userId
}
