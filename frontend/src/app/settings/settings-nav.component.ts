import { GlobalService } from '@models/global.service';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '@app/app/header/header.component';
import { HeaderLinkItemComponent } from '@app/app/header/header-link-item/header-link-item.component';
import { PermissionsDirective } from '@directives/permissions.directive';

@Component({
    selector: 'app-settings-nav',
    templateUrl: './settings-nav.component.html',
    imports: [RouterModule, HeaderComponent, HeaderLinkItemComponent, PermissionsDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsNavComponent {
    #global = inject(GlobalService);
    reloadEnvironment = () => this.#global.reload();
}
