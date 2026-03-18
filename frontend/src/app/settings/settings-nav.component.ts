import { GlobalService } from 'src/models/global.service';
import { Component, inject, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HeaderModule } from '@app/app/header/header.module';
import { PermissionsDirective } from '@directives/permissions.directive';

@Component({
    selector: 'app-settings-nav',
    templateUrl: './settings-nav.component.html',
    styleUrls: ['./settings-nav.component.scss'],
    standalone: true,
    imports: [RouterModule, HeaderModule, PermissionsDirective]
})
export class SettingsNavComponent implements OnInit {

    settingKeys: string[]

    #global = inject(GlobalService)

    ngOnInit(): void {
        this.settingKeys = Object.keys(this.#global.settings)
    }

    reloadEnvironment = () => this.#global.reload()

}
