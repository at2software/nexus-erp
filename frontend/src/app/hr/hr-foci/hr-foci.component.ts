import { Component, inject, OnInit } from '@angular/core';
import { User } from 'src/models/user/user.model';
import { HrTeamService } from '../hr-team/hr-team.service';
import { HrFocusTableComponent } from '../hr-focus-table/hr-focus-table.component';

@Component({
    selector: 'hr-foci',
    templateUrl: './hr-foci.component.html',
    styleUrls: ['./hr-foci.component.scss'],
    standalone: true,
    imports: [HrFocusTableComponent]
})
export class HrFociComponent implements OnInit {
    user:User
    #parent = inject(HrTeamService)
    ngOnInit() {
        this.#parent.onUserChange.subscribe(_ => this.user = _)
    }
}
