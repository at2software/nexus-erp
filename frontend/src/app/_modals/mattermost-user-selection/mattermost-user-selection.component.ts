import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MattermostPlugin } from '@models/http/plugin.mattermost';
import { User } from '@models/user/user.model';
import { ModalBaseComponent } from '@app/_modals/modal-base.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'mattermost-user-selection',
    templateUrl: './mattermost-user-selection.component.html',
    styleUrls: ['./mattermost-user-selection.component.scss'],
    imports: [FormsModule],
})
export class MattermostUserSelectionComponent extends ModalBaseComponent<string> {
    mattermostPlugin!: MattermostPlugin;
    selectedUserId = signal('');
    searchTerm = signal('');

    init(_: MattermostPlugin): void {
        this.mattermostPlugin = _;
    }

    onSuccess = () => this.selectedUserId();

    isRootInstance = (): boolean => this.mattermostPlugin?.isRootInstance() ?? false;

    getMattermostUsers = (): User[] => {
        const users = this.mattermostPlugin?.getUsers() || [];
        let filteredUsers = users;
        const term = this.searchTerm().trim().toLowerCase();
        if (term) {
            filteredUsers = users.filter((u: User) => u.getName().toLowerCase().includes(term) || u.var?.data?.username?.toLowerCase().includes(term) || u.var?.data?.email?.toLowerCase().includes(term));
        }
        return filteredUsers.sort((a, b) => a.getName().localeCompare(b.getName()));
    };

    selectUser = (userId: string) => {
        this.selectedUserId.set(userId || '');
    };

    isSelected = (userId: string) => this.selectedUserId() === (userId || '');
}
