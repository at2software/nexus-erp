import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { environment } from 'src/environments/environment';
import { Role, UserRoleEntry } from 'src/models/user/role.model';
import { User } from 'src/models/user/user.model';import { RoleService } from '@models/user/role.service';
import { GlobalService } from 'src/models/global.service';
import { UserService } from 'src/models/user/user.service';
import { RolePipe } from 'src/pipes/role.pipe';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { ModalNewUserService } from '@app/_modals/modal-new-user/modal-new-user.component';
import { AuthenticationService } from 'src/models/auth.service';
import { NexusModule } from '@app/nx/nexus.module';

const SPECIALIZED_ROLES = ['project_manager', 'invoicing', 'financial', 'marketing', 'hr', 'product_manager']

@Component({
    selector: 'settings-users',
    templateUrl: './roles.component.html',
    styleUrls: ['./roles.component.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, NgbTooltipModule, RolePipe, ScrollbarComponent, ToolbarComponent, NexusModule]
})
export class UsersComponent implements OnInit {

    env          = environment
    roles: Role[]          = []
    users: User[]          = []
    selectedRole: Role | null = null
    isLoading    = true
    isTokenAuth  = AuthenticationService.sysinfo?.method === 'token'
    resetPasswordUserId: string | null = null
    resetPasswordValue = ''

    #roleService  = inject(RoleService)
    #userService  = inject(UserService)
    #global       = inject(GlobalService)
    #newUserModal = inject(ModalNewUserService)

    get currentUserId() { return this.#global.user?.id }
    get isAdmin()       { return this.#global.user?.hasRole('admin') ?? false }

    async ngOnInit() {
        const data    = await this.#roleService.loadRoleManagement()
        this.roles    = this.#sortRoles(data.roles)
        this.users    = data.users.map((u: UserRoleEntry) => User.fromJson(u))
        this.selectedRole = this.roles[0] ?? null
        this.isLoading = false
    }

    #setUsers(users: UserRoleEntry[]) {
        this.users = users.map((u: UserRoleEntry) => User.fromJson(u))
    }

    #sortRoles(roles: Role[]): Role[] {
        return [...roles].sort((a, b) => {
            if (a.name === 'guest') return 1
            if (b.name === 'guest') return -1
            return 0
        })
    }

    selectRole(role: Role) {
        this.selectedRole = role
    }

    hasRole(user: User, roleName: string): boolean {
        return user.role_names.includes(roleName)
    }

    isAdminUser(user: User): boolean {
        return user.role_names.includes('admin')
    }

    isGuestUser(user: User): boolean {
        return user.role_names.includes('guest')
    }

    /** Warn if user has specialized roles but no 'user' base role */
    needsWarning(user: User): boolean {
        if (this.isAdminUser(user)) return false
        return SPECIALIZED_ROLES.some(r => user.role_names.includes(r)) && !user.role_names.includes('user')
    }

    /** Disable toggle: guest blocks all non-admin/non-guest; can't remove own admin */
    isDisabled(user: User, role: Role): boolean {
        if (role.name !== 'admin' && role.name !== 'guest' && this.isGuestUser(user)) return true
        if (role.name === 'admin' && user.id === this.currentUserId) return true
        return false
    }

    async toggle(user: User, role: Role) {
        if (this.isDisabled(user, role)) return
        const fn   = this.hasRole(user, role.name) ? 'removeRole' : 'assignRole'
        const data = await this.#roleService[fn](role.id, user.id)
        this.roles = this.#sortRoles(data.roles)
        this.#setUsers(data.users)
    }

    async addUser() {
        const data = await this.#newUserModal.open().catch(() => undefined)
        if (!data) return
        this.#userService.create(data).subscribe(async () => {
            const result = await this.#roleService.loadRoleManagement()
            this.roles = this.#sortRoles(result.roles)
            this.#setUsers(result.users)
        })
    }

    startResetPassword(user: User) {
        this.resetPasswordUserId = user.id
        this.resetPasswordValue = ''
    }

    cancelResetPassword() {
        this.resetPasswordUserId = null
        this.resetPasswordValue = ''
    }

    confirmResetPassword(user: User) {
        if (this.resetPasswordValue.length < 8) return
        this.#userService.resetPassword(user.id, this.resetPasswordValue).subscribe(() => {
            this.cancelResetPassword()
        })
    }
}
