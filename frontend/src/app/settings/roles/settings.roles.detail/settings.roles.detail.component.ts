import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { RoleService } from '@models/user/role.service';

@Component({
    selector: 'settings.roles.detail',
    templateUrl: './settings.roles.detail.component.html',
    styleUrls: ['./settings.roles.detail.component.scss'],
    standalone: true,
    imports: [NgTemplateOutlet, NgbTooltipModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsRolesDetailComponent {
    #currentRole = signal<any>(null);
    #route = inject(ActivatedRoute);
    #roleService = inject(RoleService) as any;

    constructor() {
        this.#route.params.subscribe(async (route) => {
            await this.#roleService.loaded();
            this.#currentRole.set(this.#roleService.roles.find((_: any) => _.name == route.role) ?? null);
        });
    }

    allPermissions = () => Object.keys(this.#currentRole()?.permissions ?? []);

    permissionsFor = (...prefixes: string[]): string[] => {
        const prefixKey = prefixes.join('.') + '.';
        return this.allPermissions()
            .filter((_) => _.startsWith(prefixKey))
            .map((_) => _.substring(prefixKey.length, _.indexOf('.', prefixKey.length) > 0 ? _.indexOf('.', prefixKey.length) : _.length))
            .unique();
    };

    getMainPermissions = () => [
        ...new Set(
            this.#roleService
                .allPermissions()
                .filter((_: string) => !_.startsWith('api') && !_.startsWith('crud'))
                .map((_: string) => _.split('.')[0]),
        ),
    ];

    getCrudPermissions = () => [
        ...new Set(
            this.#roleService
                .allPermissions()
                .filter((_: string) => _.startsWith('crud'))
                .map((_: string) => _.split('.')[0]),
        ),
    ];

    getApiPermissions = () => [
        ...new Set(
            this.#roleService
                .allPermissions()
                .filter((_: string) => _.startsWith('api'))
                .map((_: string) => _.split('.')[0]),
        ),
    ];

    filteredPermissions = (value: string): string[] => {
        const role = this.#currentRole();
        return role ? Object.keys(role.permissions).filter((_: string) => _.startsWith(value)) : [];
    };

    permissionName = (value: string) => value.substring(value.lastIndexOf('.') + 1);

    hasAllPermissionsFor = (value: string): boolean => {
        for (const _ of this.filteredPermissions(value)) {
            if (!this.#currentRole().permissions[_]) return false;
        }
        return true;
    };

    hasSomePermissionsFor = (value: string): boolean => {
        for (const _ of this.filteredPermissions(value)) {
            if (this.#currentRole().permissions[_]) return true;
        }
        return false;
    };

    colorForPermissionLevel = (value: string) => {
        if (this.hasAllPermissionsFor(value)) return 'success';
        if (this.hasSomePermissionsFor(value)) return 'yellow';
        return 'grey';
    };

    hasPermission = (_: string): boolean => this.#currentRole()?.permissions[_];

    async onUpdate(value: string) {
        const role = this.#currentRole();
        if (!role) return;
        role.permissions[value] = !role.permissions[value];
        await this.#roleService.update(role);
    }

    async onUpdateAll(value: string) {
        const role = this.#currentRole();
        if (!role) return;
        const all = !this.hasAllPermissionsFor(value);
        for (const _ of this.filteredPermissions(value)) {
            role.permissions[_] = all;
        }
        await this.#roleService.update(role);
    }
}
