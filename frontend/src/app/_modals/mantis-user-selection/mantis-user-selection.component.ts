import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MantisPlugin } from '@models/http/plugin.mantis';
import { User } from '@models/user/user.model';
import { ModalBaseComponent } from '@app/_modals/modal-base.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'mantis-user-selection',
    templateUrl: './mantis-user-selection.component.html',
    styleUrls: ['./mantis-user-selection.component.scss'],
    imports: [FormsModule],
})
export class MantisUserSelectionComponent extends ModalBaseComponent<string> {
    mantisPlugin!: MantisPlugin;
    selectedUserId = signal('');
    searchTerm = signal('');

    init(_: MantisPlugin): void {
        this.mantisPlugin = _;
    }

    onSuccess = () => this.selectedUserId();

    isRootInstance = (): boolean => this.mantisPlugin?.isRootInstance() ?? false;

    getMantisUsers = (): User[] => {
        const users = this.mantisPlugin?.getUsers() || [];
        let filteredUsers = users;
        const term = this.searchTerm().trim().toLowerCase();
        if (term) {
            filteredUsers = users.filter((u: User) => u.getName().toLowerCase().includes(term) || u.var?.data?.email?.toLowerCase().includes(term) || u.var?.data?.real_name?.toLowerCase().includes(term));
        }
        return filteredUsers.sort((a, b) => a.getName().localeCompare(b.getName()));
    };

    selectUser = (userId: string) => {
        this.selectedUserId.set(userId || '');
    };

    isSelected = (userId: string) => this.selectedUserId() === (userId || '');
}
