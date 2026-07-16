import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import * as forge from 'node-forge';
import { GlobalService } from '@models/global.service';
import { User } from '@models/user/user.model';
import { RsaSettingsEmptyComponent } from './rsa-settings-empty.component';
import { tracked } from '@constants/tracked';

import { FormsModule } from '@angular/forms';

@Component({
    selector: 'rsa-settings',
    templateUrl: './rsa-settings.component.html',
    imports: [RsaSettingsEmptyComponent, FormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RsaSettingsComponent {
    
    readonly user = input.required<User>();
    readonly trackedUser = tracked(this.user);

    saveCookie: boolean = false;

    global = inject(GlobalService);

    downloadPublicKey = () => this.downloadPem(forge.pki.publicKeyToPem(this.trackedUser().keyPair!.publicKey), 'public.pem');
    downloadPrivateKey = () => this.downloadPem(forge.pki.privateKeyToPem(this.trackedUser().keyPair!.privateKey), 'private.pem');
    downloadPem(data: string, filename: string) {
        const blob = new Blob([data], { type: 'application/x-pem-file' });
        const a = document.createElement('a');
        const url = window.URL.createObjectURL(blob);
        document.body.appendChild(a);
        a.href = url;
        a.download = filename;
        a.click();
        document.body.removeChild(a);
    }
}
