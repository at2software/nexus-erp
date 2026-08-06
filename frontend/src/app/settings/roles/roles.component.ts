import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { modelResource } from '@models/http/model-resource';
import { FormsModule } from '@angular/forms';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { environment } from '@environments/environment';
import { Role } from '@models/user/role.model';
import { User } from '@models/user/user.model';
import { RoleService } from '@models/user/role.service';
import { GlobalService } from '@models/global.service';
import { UserService } from '@models/user/user.service';
import { RolePipe } from '@pipes/role.pipe';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { ModalNewUserService } from '@app/_modals/modal-new-user/modal-new-user.component';
import { AuthenticationService } from '@models/auth.service';
import { Nx } from '@app/nx/nx.directive';
import { SpinnerComponent } from '@shards/spinner/spinner.component';
import { StackedTableDirective } from '@directives/stacked-table.directive';

const SPECIALIZED_ROLES = ['project_manager', 'invoicing', 'financial', 'marketing', 'hr', 'product_manager'];

@Component({
    selector: 'settings-users',
    templateUrl: './roles.component.html',
    styleUrls: ['./roles.component.scss'],
    imports: [StackedTableDirective, FormsModule, NgbTooltipModule, RolePipe, ScrollbarComponent, ToolbarComponent, Nx, SpinnerComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersComponent {
    readonly env = environment;
    readonly isTokenAuth = AuthenticationService.sysinfo?.method === 'token';
    resetPasswordUserId = signal<string | null>(null);
    resetPasswordValue = signal('');

    #roleService = inject(RoleService);
    #userService = inject(UserService);
    #global = inject(GlobalService);
    #newUserModal = inject(ModalNewUserService);

    readonly currentUserId = computed(() => this.#global.user?.id);
    readonly isAdmin = computed(() => this.#global.user?.hasRole('admin') ?? false);

    readonly #management = modelResource(() => this.#roleService.indexRoleManagement());
    readonly isLoading = this.#management.isLoading;
    readonly roles = linkedSignal(() => this.#sortRoles(this.#management.value()?.roles ?? []));
    readonly users = linkedSignal(() => this.#management.value()?.users ?? []);
    readonly selectedRole = linkedSignal<Role[], Role | null>({
        source: this.roles,
        computation: (roles, previous) => roles.find((_) => _.id === previous?.value?.id) ?? roles[0] ?? null,
    });

    selectRole = (role: Role) => this.selectedRole.set(role);
    hasRole = (user: User, roleName: string) => user.role_names.includes(roleName);
    isAdminUser = (user: User) => user.role_names.includes('admin');
    isGuestUser = (user: User) => user.role_names.includes('guest');

    needsWarning(user: User) {
        if (this.isAdminUser(user)) return false;
        return SPECIALIZED_ROLES.some((r) => user.role_names.includes(r)) && !user.role_names.includes('user');
    }

    isDisabled(user: User, role: Role) {
        if (role.name !== 'admin' && role.name !== 'guest' && this.isGuestUser(user)) return true;
        if (role.name === 'admin' && user.id === this.currentUserId()) return true;
        return false;
    }

    async toggle(user: User, role: Role) {
        if (this.isDisabled(user, role)) return;
        const fn = this.hasRole(user, role.name) ? 'removeRole' : 'assignRole';
        const data = await this.#roleService[fn](role.id, user.id);
        this.roles.set(this.#sortRoles(data.roles));
        this.users.set(data.users);
    }

    async addUser() {
        const data = await this.#newUserModal.open().catch(() => undefined);
        if (!data) return;
        this.#userService.create(data).subscribe(() => this.#management.reload());
    }

    startResetPassword(user: User) {
        this.resetPasswordUserId.set(user.id);
        this.resetPasswordValue.set('');
    }

    cancelResetPassword() {
        this.resetPasswordUserId.set(null);
        this.resetPasswordValue.set('');
    }

    confirmResetPassword(user: User) {
        if (this.resetPasswordValue().length < 8) return;
        this.#userService.resetPassword(user.id, this.resetPasswordValue()).subscribe(() => this.cancelResetPassword());
    }

    #sortRoles = (roles: Role[]) => [...roles].sort((a, b) => (a.name === 'guest' ? 1 : b.name === 'guest' ? -1 : 0));
}
