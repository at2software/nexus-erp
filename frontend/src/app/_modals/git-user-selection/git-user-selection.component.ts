import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { GitLabPlugin } from '@models/http/plugin.gitlab';
import { User } from '@models/user/user.model';
import { ModalBaseComponent } from '@app/_modals/modal-base.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'git-user-selection',
    templateUrl: './git-user-selection.component.html',
    styleUrls: ['./git-user-selection.component.scss'],
    standalone: true,
    imports: [FormsModule],
})
export class GitUserSelectionComponent extends ModalBaseComponent<string> {
    gitPlugin!: GitLabPlugin;
    selectedUsername = signal('');
    searchTerm = signal('');

    init(_: GitLabPlugin): void {
        this.gitPlugin = _;
    }

    onSuccess = () => this.selectedUsername();

    isRootInstance = (): boolean => this.gitPlugin?.isRootInstance() ?? false;

    getGitUsers = (): User[] => {
        const users = this.gitPlugin?.getUsers() || [];
        let filteredUsers = users;
        const term = this.searchTerm().trim().toLowerCase();
        if (term) {
            filteredUsers = users.filter((u: User) => u.getName().toLowerCase().includes(term) || u.var?.data?.username?.toLowerCase().includes(term) || u.var?.data?.email?.toLowerCase().includes(term));
        }
        return filteredUsers.sort((a, b) => a.getName().localeCompare(b.getName()));
    };

    selectUser = (username: string) => {
        this.selectedUsername.set(username || '');
    };

    isSelected = (username: string) => this.selectedUsername() === (username || '');
}
