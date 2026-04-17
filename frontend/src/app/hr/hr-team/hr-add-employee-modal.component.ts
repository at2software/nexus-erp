import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbDateAdapter, NgbDatepickerModule } from '@ng-bootstrap/ng-bootstrap';
import { NgbDateCarbonAdapter } from 'src/directives/ngb-date.adapter';
import { ModalBaseComponent } from '@app/_modals/modal-base.component';
import { UserService } from 'src/models/user/user.service';
import { GlobalService } from 'src/models/global.service';

const TYPES = ['Festanstellung', 'Praktikum', 'Werkstudent']

@Component({
    selector: 'hr-add-employee-modal',
    standalone: true,
    imports: [FormsModule, NgbDatepickerModule],
    providers: [{ provide: NgbDateAdapter, useClass: NgbDateCarbonAdapter }],
    template: `
<div class="modal d-block" tabindex="-1">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <span class="modal-title" i18n="@@i18n.hr.addEmployee">add employee</span>
      </div>
      <div class="modal-body">
        <ul class="list-group">
          <li class="list-group-item">
            <div class="input-group">
              <span class="input-group-text col-4" i18n="@@i18n.common.firstName">first name</span>
              <input type="text" class="form-control" [(ngModel)]="firstName" autocomplete="off">
            </div>
          </li>
          <li class="list-group-item">
            <div class="input-group">
              <span class="input-group-text col-4" i18n="@@i18n.common.familyName">family name</span>
              <input type="text" class="form-control" [(ngModel)]="familyName" autocomplete="off">
            </div>
          </li>
          <li class="list-group-item">
            <div class="input-group">
              <span class="input-group-text col-4" i18n="@@i18n.common.email">email</span>
              <input type="email" class="form-control" [(ngModel)]="email" autocomplete="off">
            </div>
          </li>
          <li class="list-group-item">
            <div class="input-group">
              <span class="input-group-text col-4" i18n="@@i18n.common.password">password</span>
              <input type="password" class="form-control" [(ngModel)]="password" autocomplete="new-password">
            </div>
          </li>
          <li class="list-group-item">
            <div class="input-group">
              <span class="input-group-text col-4" i18n="@@i18n.common.description">description</span>
              <select class="form-select" [(ngModel)]="employmentType">
                @for (t of TYPES; track t) {
                  <option [value]="t">{{ t }}</option>
                }
              </select>
            </div>
          </li>
          <li class="list-group-item">
            <div class="input-group">
              <span class="input-group-text col-4" i18n="@@i18n.common.hoursPerWeek">hours per week</span>
              <input type="number" class="form-control" [(ngModel)]="hpw">
            </div>
          </li>
          <li class="list-group-item">
            <div class="input-group">
              <span class="input-group-text col-4" i18n="@@i18n.common.start">start</span>
              <input ngbDatepicker #d="ngbDatepicker" placeholder="yyyy-mm-dd" class="form-control" tabindex="-1"
                [(ngModel)]="startedAt" (click)="d.toggle()">
            </div>
          </li>
        </ul>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn" (click)="decline()" i18n="@@i18n.common.cancel">cancel</button>
        <button type="button" class="btn btn-primary" (click)="onCreate()" [disabled]="!firstName || !familyName || !email || !password || !startedAt" i18n="@@i18n.hr.addEmployee">add employee</button>
      </div>
    </div>
  </div>
</div>
`
})
export class HrAddEmployeeModalComponent extends ModalBaseComponent<void> {
    TYPES = TYPES

    firstName  = ''
    familyName = ''
    email      = ''
    password   = ''
    employmentType = TYPES[0]
    hpw        = 40
    startedAt: string = ''

    #userService = inject(UserService)
    #global      = inject(GlobalService)

    init(): void { /* noop */ }
    onSuccess(): void { /* noop */ }

    onCreate() {
        this.#userService.create({
            first_name:  this.firstName,
            family_name: this.familyName,
            email:       this.email,
            password:    this.password,
            employment: {
                type:       this.employmentType,
                hpw:        this.hpw,
                started_at: this.startedAt,
            }
        }).subscribe(() => {
            this.#global.reload()
            this.dismiss()
        })
    }
}
