import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { GlobalService } from '@models/global.service';
import { tracked } from '@constants/tracked';
import { environment } from 'src/environments/environment';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { VcardComponent } from '@app/customers/_shards/vcard/vcard.component';

@Component({
    selector: 'profile-vcard',
    templateUrl: './profile-vcard.component.html',
    standalone: true,
    imports: [ScrollbarComponent, VcardComponent, NgbTooltipModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileVcardComponent {
    #global = inject(GlobalService);
    readonly user = tracked(computed(() => this.#global.user));
    readonly carddavUrl = environment.envApi + 'carddav/';
    readonly caldavUrl = environment.envApi + 'caldav/';

    copyToClipboard = (text: string) => navigator.clipboard.writeText(text).catch(console.error);
}
