import { Component, inject, input } from '@angular/core';
import * as forge from 'node-forge';
import { GlobalService } from 'src/models/global.service';
import { User } from 'src/models/user/user.model';
import { RsaSettingsEmptyComponent } from './rsa-settings-empty.component';

import { FormsModule } from '@angular/forms';

@Component({
    selector: 'rsa-settings',
    templateUrl: './rsa-settings.component.html',
    styleUrls: ['./rsa-settings.component.scss'],
    standalone: true,
    imports: [RsaSettingsEmptyComponent, FormsModule]
})
export class RsaSettingsComponent {
    
    user = input.required<User>()

    saveCookie:boolean = false

    global = inject(GlobalService)

    downloadPublicKey = () => this.downloadPem(forge.pki.publicKeyToPem(this.user().keyPair!.publicKey), 'public.pem')
    downloadPrivateKey = () => this.downloadPem(forge.pki.privateKeyToPem(this.user().keyPair!.privateKey), 'private.pem')
    downloadPem(data: string, filename: string) {
        const blob = new Blob([data], { type: 'application/x-pem-file' });
        const a    = document.createElement('a')
        const url  = window.URL.createObjectURL(blob);
        document.body.appendChild(a)
        a.href = url
        a.download = filename
        a.click()
        document.body.removeChild(a)
    }
}
