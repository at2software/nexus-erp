import { Component, OnInit, inject } from '@angular/core';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { GlobalService } from 'src/models/global.service';
import { User } from 'src/models/user/user.model';

import { environment } from 'src/environments/environment';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { VcardComponent } from '@app/customers/_shards/vcard/vcard.component';

@Component({
    selector: 'profile-vcard',
    templateUrl: './profile-vcard.component.html',
    standalone: true,
    imports: [ScrollbarComponent, VcardComponent, NgbTooltipModule]
})
export class ProfileVcardComponent implements OnInit {

    user: User
    global = inject(GlobalService)

    carddavUrl = environment.envApi + 'carddav/'
    caldavUrl  = environment.envApi + 'caldav/'

    ngOnInit() {
        this.user = this.global.user!
    }

    copyToClipboard(text: string) {
        navigator.clipboard.writeText(text).then(() => {
            // Success
        }).catch(err => {
            console.error('Failed to copy:', err)
        })
    }

}
