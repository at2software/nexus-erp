import { EventEmitter, inject, Injectable } from '@angular/core';
import { Role, UserRoleEntry } from 'src/models/user/role.model';
import { GlobalService } from '../global.service';
import { BaseHttpService } from '../http.service';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RoleService extends BaseHttpService {

    onReady = new EventEmitter<void>()
    onUpdate = new EventEmitter<void>()

    #isReady = false
    get isReady(): boolean { return this.#isReady }

    global = inject(GlobalService)

    constructor() {
        super()
        // Mark ready once the global environment (user + role_names) is loaded
        this.global.init.subscribe(() => {
            if (!this.#isReady) {
                this.#isReady = true
                this.onReady.next()
            }
        })
    }

    // === Admin role management API ===

    async loadRoleManagement(): Promise<{ roles: Role[], users: UserRoleEntry[] }> {
        const response: any = await firstValueFrom(this.get('roles/'))
        return {
            roles: (response.roles ?? []).map((r: any) => Role.fromJson(r)),
            users: response.users ?? [],
        }
    }

    async assignRole(roleId: number, userId: string): Promise<{ roles: Role[], users: UserRoleEntry[] }> {
        const response: any = await firstValueFrom(this.post(`roles/${roleId}/users/${userId}`, {}))
        return {
            roles: (response.roles ?? []).map((r: any) => Role.fromJson(r)),
            users: response.users ?? [],
        }
    }

    async removeRole(roleId: number, userId: string): Promise<{ roles: Role[], users: UserRoleEntry[] }> {
        const response: any = await firstValueFrom(this.delete(`roles/${roleId}/users/${userId}`))
        return {
            roles: (response.roles ?? []).map((r: any) => Role.fromJson(r)),
            users: response.users ?? [],
        }
    }

    // Role checking
    hasAnyRole(roles: string): boolean {
        const requiredRoles = roles.split('|')
        return this.global.user?.hasAnyRole(requiredRoles) ?? false
    }
}
