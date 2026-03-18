
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { HeaderModule } from '@app/app/header/header.module';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { DndDirective } from '@directives/dnd.directive';
import { ConfirmationService } from '@app/_modals/modal-confirm/confirmation.service';
import { AuthenticationService } from 'src/models/auth.service';
import { GlobalService } from 'src/models/global.service';

@Component({
    selector: 'profile-nav',
    templateUrl: './profile-nav.component.html',
    styleUrls: ['./profile-nav.component.scss'],
    standalone: true,
    imports: [RouterModule, ToolbarComponent, DndDirective, HeaderModule, NgbDropdownModule]
})
export class ProfileNavComponent {
    #authService = inject(AuthenticationService)
    #confirmationService = inject(ConfirmationService)
    global = inject(GlobalService)

    confirmLogout = async () => {
        try {
            await this.#confirmationService.confirm({
                title: $localize`:@@i18n.common.attention:attention`,
                message: $localize`:@@i18n.profile.confirmLogout:Do you really want to log out?`,
                dialogSize: 'sm'
            });
            this.#authService.logout();
        } catch {
            // User cancelled
        }
    }

    onDndUploaded = () => window.location.reload()
}
