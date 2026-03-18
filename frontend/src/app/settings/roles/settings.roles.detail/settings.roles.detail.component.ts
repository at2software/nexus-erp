import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { Role } from 'src/models/user/role.model';
import { RoleService } from '@models/user/role.service';

@Component({
    selector: 'settings.roles.detail',
    templateUrl: './settings.roles.detail.component.html',
    styleUrls: ['./settings.roles.detail.component.scss'],
    standalone: true,
    imports: [CommonModule, NgbTooltipModule]
})
export class SettingsRolesDetailComponent implements OnInit {

    #currentRole:Role
    #route = inject(ActivatedRoute)
    #roleService = inject(RoleService)

    ngOnInit() {
        this.#route.params.subscribe(async route => {
            await this.#roleService.loaded()
            this.#currentRole = this.#roleService.roles.find(_ => _.name == route.role)!
        })
    }
    allPermissions = () => Object.keys(this.#currentRole?.permissions ?? [])
    permissionsFor (...prefixes:string[]):string[] {
        const prefixKey = prefixes.join('.') + '.'
        return this.allPermissions().
            filter(_ => _.startsWith(prefixKey)).
            map(_ => _.substring(prefixKey.length, _.indexOf('.', prefixKey.length) > 0 ? _.indexOf('.', prefixKey.length) : _.length)). 
            unique()
    }

    // new Set to ensure everything is unique
    getMainPermissions = () => [... new Set(this.#roleService.allPermissions().filter(_=>!_.startsWith('api') && !_.startsWith('crud')).map(_ => _.split('.')[0]))]
    getCrudPermissions = () => [... new Set(this.#roleService.allPermissions().filter(_=>_.startsWith('crud')).map(_ => _.split('.')[0]))]
    getApiPermissions = () => [... new Set(this.#roleService.allPermissions().filter(_=>_.startsWith('api')).map(_ => _.split('.')[0]))]
    
    filteredPermissions = (value:string):string[] => this.#currentRole ? Object.keys(this.#currentRole.permissions).filter((_:string) => _.startsWith(value)) : []
    permissionName = (value:string):string => value.substring(value.lastIndexOf('.') + 1)
    hasAllPermissionsFor = (value:string):boolean => {
        for (const _ of this.filteredPermissions(value)) {
            if (!this.#currentRole.permissions[_]) {
                return false;
            }
        }
        return true
    }
    hasSomePermissionsFor = (value:string):boolean => {
        for (const _ of this.filteredPermissions(value)) {
            if (this.#currentRole.permissions[_]) {
                return true;
            }
        }
        return false
    }
    colorForPermissionLevel = (value:string):string => {
        if (this.hasAllPermissionsFor(value)) return 'success'
        if (this.hasSomePermissionsFor(value)) return 'yellow'
        return 'grey'
    }
    async onUpdate(value:string) {
        if (!this.#currentRole) return;
        this.#currentRole.permissions[value] = !this.#currentRole.permissions[value];
        await this.#roleService.update(this.#currentRole)
    }
    async onUpdateAll(value:string) {
        if (!this.#currentRole) return;
        const all = !this.hasAllPermissionsFor(value)
        for (const _ of this.filteredPermissions(value)) {
            this.#currentRole.permissions[_] = all
        }
        await this.#roleService.update(this.#currentRole)
    }
    hasPermission = (_:string):boolean => this.#currentRole?.permissions[_]
}
