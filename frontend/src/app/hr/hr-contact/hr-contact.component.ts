import { Component, inject, OnInit } from '@angular/core';
import { User } from 'src/models/user/user.model';
import { HrDetailGuard } from '../hr-details.guard';
import { FormsModule } from '@angular/forms';
import { AutosaveDirective } from 'src/directives/autosave.directive';
import { DB_PLZ } from '../../customers/_shards/db.plz';
import { VcardComponent } from '@app/customers/_shards/vcard/vcard.component';

@Component({
    selector: 'hr-contact',
    templateUrl: './hr-contact.component.html',
    styleUrls: ['./hr-contact.component.scss'],
    standalone: true,
    imports: [FormsModule, VcardComponent, AutosaveDirective]
})
export class HrContactComponent implements OnInit {
    users:User[]
    #parent = inject(HrDetailGuard)
    db_plz: any[] = DB_PLZ
    
    ngOnInit() {
        this.#parent.onChange.subscribe(_ =>  this.users = [_])
    }
    
    #getWorkplaceCity(zip?: number): string {
        if (!zip || zip.toString().length !== 5) return ''
        const plzEntry = this.db_plz.find((x: any) => x.plz == zip)
        return plzEntry ? plzEntry.ort : ''
    }
    
    getWorkplaceCity = (user: User): string => this.#getWorkplaceCity(user.work_zip)
}
