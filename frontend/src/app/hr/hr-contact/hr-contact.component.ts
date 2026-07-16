import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { User } from '@models/user/user.model';
import { HrDetailGuard } from '../hr-details.guard';
import { FormsModule } from '@angular/forms';
import { AutosaveDirective } from '@directives/autosave.directive';
import { PlzDbService } from '@app/customers/_shards/plz-db.service';
import { VcardComponent } from '@app/customers/_shards/vcard/vcard.component';

@Component({
    selector: 'hr-contact',
    templateUrl: './hr-contact.component.html',
    imports: [FormsModule, VcardComponent, AutosaveDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HrContactComponent {
    #parent = inject(HrDetailGuard);
    #plzDb = inject(PlzDbService);

    users = signal<User[]>([]);
    plzReady = signal(false);

    constructor() {
        effect(() => {
            this.users.set([this.#parent.object()]);
        });

        this.#plzDb.ensureLoaded().then(() => {
            this.plzReady.set(true);
        });
    }

    getWorkplaceCity = (user: User): string => {
        this.plzReady();
        if (!user.work_zip || user.work_zip.toString().length !== 5) return '';
        const [entry] = this.#plzDb.lookupSync(user.work_zip);
        return entry?.ort ?? '';
    };
}
