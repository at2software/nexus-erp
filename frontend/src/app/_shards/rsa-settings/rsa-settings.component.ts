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
    styleUrls: ['./rsa-settings.component.scss'],
    standalone: true,
    imports: [RsaSettingsEmptyComponent, FormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RsaSettingsComponent {
    readonly userIn = input.required<User>({ alias: 'user' });
    readonly user = tracked(this.userIn);

    saveCookie: boolean = false;

    global = inject(GlobalService);

    downloadPublicKey = () => this.downloadPem(forge.pki.publicKeyToPem(this.user().keyPair!.publicKey), 'public.pem');
    downloadPrivateKey = () => this.downloadPem(forge.pki.privateKeyToPem(this.user().keyPair!.privateKey), 'private.pem');
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
