import { Component, ViewChild, inject, OnInit } from "@angular/core";
import { ModalBaseService } from "@app/_modals/modal-base-service";
import { User } from "src/models/user/user.model";
import { VacationGrant } from "src/models/vacation/vacation-grant.model";
import { HrVacationGrantModalComponent } from "./hr-vacation-grant-modal.component";
import { HrVacationComponent } from "./hr-vacation.component";
import { HrTeamService } from "../hr-team/hr-team.service";
import { ToolbarComponent } from "@app/app/toolbar/toolbar.component";

import { HotkeyDirective } from '@directives/hotkey.directive';

@Component({
    selector: 'hr-vacation-container',
    templateUrl: './hr-vacation-container.component.html',
    standalone: true,
    imports: [ToolbarComponent, HrVacationComponent, HotkeyDirective]
})
export class HrVacationContainerComponent implements OnInit {

    @ViewChild(HrVacationComponent) hrVacationComponent: HrVacationComponent;

    currentUser:User
    #parent = inject(HrTeamService)
    #modal = inject(ModalBaseService)

    ngOnInit() {
        this.#parent.onUserChange.subscribe(_ => {
            this.currentUser = _
        })
    }
    onAddGrant() {
        this.#modal.open(HrVacationGrantModalComponent, VacationGrant.fromJson({}), this.currentUser).then(_ => {
            _.store({ name: _.name, expires_at:_.expires_at, amount: _.amount, user_id: _.user_id}).subscribe(() => this.hrVacationComponent.reload())
        })
    }
}