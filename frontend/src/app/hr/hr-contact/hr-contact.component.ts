import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { User } from '@models/user/user.model';
import { HrDetailGuard } from '../hr-details.guard';
import { FormsModule } from '@angular/forms';
import { AutosaveDirective } from '@directives/autosave.directive';
import { DB_PLZ } from '../../customers/_shards/db.plz';
import { VcardComponent } from '@app/customers/_shards/vcard/vcard.component';

@Component({
    selector: 'hr-contact',
    templateUrl: './hr-contact.component.html',
    styleUrls: ['./hr-contact.component.scss'],
    standalone: true,
    imports: [FormsModule, VcardComponent, AutosaveDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HrContactComponent {
    #parent = inject(HrDetailGuard);
    readonly #db_plz: any[] = DB_PLZ;

    users = signal<User[]>([]);

    constructor() {
        effect(() => {
            this.users.set([this.#parent.object()]);
        });
    }

    getWorkplaceCity = (user: User): string => {
        if (!user.work_zip || user.work_zip.toString().length !== 5) return '';
        const entry = this.#db_plz.find((x: any) => x.plz == user.work_zip);
        return entry?.ort ?? '';
    };
}
