import { EventEmitter, inject, Injectable } from '@angular/core';
import { Dictionary } from '@constants/constants';
import { Role } from '@models/user/role.model';
import { User } from '@models/user/user.model';
import { GlobalService } from '../global.service';
import { NexusHttpService } from '../http/http.nexus';
import { Serializable } from '../serializable';
import { firstValueFrom } from 'rxjs';

type RoleResponse = { roles: Role[]; users: User[] };
type RoleManagementResponse = { roles?: Dictionary[]; users?: Dictionary[] };

@Injectable({ providedIn: 'root' })
export class RoleService extends NexusHttpService<Serializable> {
    apiPath = 'roles';
    onReady = new EventEmitter<void>();
    onUpdate = new EventEmitter<void>();

    #isReady = false;
    get isReady(): boolean {
        return this.#isReady;
    }

    global = inject(GlobalService);

    constructor() {
        super();
        // Mark ready once the global environment (user + role_names) is loaded
         
        this.global.init.subscribe(() => {
            if (!this.#isReady) {
                this.#isReady = true;
                this.onReady.next();
            }
        });
    }

    // === Admin role management API ===

    #convertToModels = (data: RoleManagementResponse): RoleResponse => ({
        roles: (data.roles ?? []).map((r) => Role.fromJson(r)),
        users: (data.users ?? []).map((u) => User.fromJson(u)),
    })
    async loadRoleManagement(): Promise<RoleResponse> {
        const response = await firstValueFrom(this.get<RoleManagementResponse>('roles/'));
        return this.#convertToModels(response);
    }

    async assignRole(roleId: number, userId: string): Promise<RoleResponse> {
        const response = await firstValueFrom(this.post<RoleManagementResponse>(`roles/${roleId}/users/${userId}`, {}));
        return this.#convertToModels(response);
    }

    async removeRole(roleId: number, userId: string): Promise<RoleResponse> {
        const response = await firstValueFrom(this.delete<RoleManagementResponse>(`roles/${roleId}/users/${userId}`));
        return this.#convertToModels(response);
    }

    // Role checking
    hasAnyRole(roles: string): boolean {
        const requiredRoles = roles.split('|');
        return this.global.user?.hasAnyRole(requiredRoles) ?? false;
    }
}
