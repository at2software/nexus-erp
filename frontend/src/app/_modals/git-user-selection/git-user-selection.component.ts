import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { GitLabPlugin } from '@models/http/plugin.gitlab';
import { User } from '@models/user/user.model';
import { ModalBaseComponent } from '@app/_modals/modal-base.component';

@Component({
    selector: 'git-user-selection',
    templateUrl: './git-user-selection.component.html',
    styleUrls: ['./git-user-selection.component.scss'],
    standalone: true,
    imports: [FormsModule]
})
export class GitUserSelectionComponent extends ModalBaseComponent<string> {

  gitPlugin: GitLabPlugin
  selectedUsername: string
  searchTerm: string = ''

  init(_: GitLabPlugin): void {
    this.gitPlugin = _
  }

  onSuccess = () => this.selectedUsername

  isRootInstance = (): boolean => this.gitPlugin?.isRootInstance() ?? false

  getGitUsers = (): User[] => {
    const users = this.gitPlugin?.getUsers() || []
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

  selectUser = (username: string) => {
    this.selectedUsername = username
  }

  isSelected = (username: string) => this.selectedUsername === username
}
