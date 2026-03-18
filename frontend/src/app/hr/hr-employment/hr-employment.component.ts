import { Component, inject, TemplateRef, OnInit } from '@angular/core';
import { User } from 'src/models/user/user.model';
import moment from 'moment';
import { UserService } from 'src/models/user/user.service';
import { GlobalService } from 'src/models/global.service';
import { environment } from 'src/environments/environment';
import { REFLECTION } from 'src/constants/constants';
import { NgbDatepickerModule, NgbDateStruct, NgbModal, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { ModalBaseService } from '@app/_modals/modal-base-service';
import { ModalNewUserService } from '@app/_modals/modal-new-user/modal-new-user.component';
import { ModalNewEmploymentComponent } from './modal-new-employment.component';
import { UserEmployment } from 'src/models/user/user-employment.model';
import { HrTeamService } from '../hr-team/hr-team.service';
import { SmartLinkDirective } from '@directives/smart-link.directive';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UlCompactComponent } from '@shards/ul-compact/ul-compact.component';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { NexusModule } from '@app/nx/nexus.module';
import { HotkeyDirective } from '@directives/hotkey.directive';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';

interface TBlocks { paid: [number,string][], vacation: [number,string][], worked: [number,string][], excluded: [number,string][], month:string, delta:number, lastDelta:number }
const newTBlocks = (month:string):TBlocks => ({ paid: [], vacation: [], worked: [], excluded: [], month:month, delta:0, lastDelta:0 })

@Component({
    selector: 'hr-employment',
    templateUrl: './hr-employment.component.html',
    styleUrls: ['./hr-employment.component.scss'],
    imports: [SmartLinkDirective, AvatarComponent, CommonModule, FormsModule, NgbDatepickerModule, NgbTooltipModule, UlCompactComponent, ToolbarComponent, NexusModule, HotkeyDirective, EmptyStateComponent],
    standalone: true
})
export class HrEmploymentComponent implements OnInit {
    user:User
    env = environment
    
    projects:any[] = []
    tbe_table:any[] = []
    employments:UserEmployment[] = []
    tblocks:Record<string, TBlocks> = {}
    maxDelta:number = 0
    minDelta:number = 0
    remInput:number = 0
    remOutput:number = 0
    roles:string[] = []
    roleColor:string

    addTbeDate:NgbDateStruct = { year: moment().year(), month: moment().month(), day: 25 }
    addTbeAmount:number = 0

    #parent       = inject(HrTeamService)
    #userService  = inject(UserService)
    #global       = inject(GlobalService)
	#modalService = inject(NgbModal)
    #modal        = inject(ModalBaseService)
    #newUserModal = inject(ModalNewUserService)

    get isAdmin() { return this.#global.user?.hasRole('admin') ?? false }

    ngOnInit() {
        this.#parent.onUserChange.subscribe(user => {
            this.user = user
            this.projects = []
            this.tbe_table = []
            this.reload()
        })
    }
    reload() {
        this.#userService.showTimeBasedEmploymentInfo(this.user).subscribe((data:any) => {
            this.projects = data.tbe_projects?.map((project:any) => REFLECTION(project)) ?? []
            this.tbe_table = data.tbe_table ?? []
            this.employments = data.employments.map((_:any) => UserEmployment.fromJson(_)) //.filter((_:UserEmployment) => _.id !== this.user.activeEmployment.id)
            this.roles = data.roles.map((_:any) => _.name)

            const blocks:Record<string, TBlocks> = {}
            //make table
            for (const _ of this.tbe_table) {
                if (!(_.month in blocks)) {
                    blocks[_.month] = newTBlocks(_.month)
                }
                if (_.type === 0) {
                    blocks[_.month].worked.push([_.duration, 'actual work time'])
                    blocks[_.month].excluded.push([_.excluded, 'excluded projects'])
                }
                else if (_.type === 1) {
                    blocks[_.month].paid.push([_.raw, 'paid time'])
                    blocks[_.month].vacation.push([_.vacation, _.description])
                }
            }
            let delta = 0
            for (const key of Object.keys(blocks)) {       
                blocks[key].lastDelta = delta
                delta = this.updateDeltas(delta, -this.getSum(blocks[key].paid))
                delta = this.updateDeltas(delta, this.getSum(blocks[key].vacation))
                delta = this.updateDeltas(delta, this.getSum(blocks[key].worked))
                blocks[key].delta = delta
            }
            this.tblocks = blocks
            if (this.user.active_employment?.is_time_based) {
                this.updateRem()
            }
        })
    }
    getTbeMonths = () => Object.values(this.tblocks)
    getMax = () => this.maxDelta - this.minDelta
    getPerc = (_:number) => 80 * _ / this.getMax()
    getSum = (_:[number, string][]) => _.map(_ => _[0]).sum()
    hasTimebasedEmployment = () => this.user.active_employment?.is_time_based ?? false
    updateDeltas = (d:number, change:number) => { 
        d += change
        this.maxDelta = Math.max(d, this.maxDelta); 
        this.minDelta = Math.min(d, this.minDelta); 
        return d
    }

    factor = (1 / 160) * 8 * (20 / 12)
    updateRem() {
        this.remOutput = (this.remInput + this.getTbeMonths().last()!.delta) / (1 - this.factor)
    }
    
	closeResult = ''
	open(content: TemplateRef<any>) {
		this.#modalService.open(content, { ariaLabelledBy: 'modal-basic-title' }).result.then((result) => { this.closeResult = `Closed with: ${result}` })
	}

    async addUser() {
        const data = await this.#newUserModal.open().catch(() => undefined)
        if (!data) return
        this.#userService.create(data).subscribe()
    }

    onNewEmployment() {
        this.#modal.open(ModalNewEmploymentComponent, this.user).then((_:UserEmployment) => {
            if (_) {
                _.store().subscribe(() =>this.reload())
            }
        })
    }

    addTbe = () => {
        const payload = {
            paid_at : this.addTbeDate.year + '-' + this.addTbeDate.month + '-' + this.addTbeDate.day,
            raw     : this.addTbeAmount,
            vacation: this.addTbeAmount * this.factor
        }
        this.#userService.addTbe(this.user, payload).subscribe(() => {
            this.#modalService.dismissAll()
            this.reload()
        })
    }
}
