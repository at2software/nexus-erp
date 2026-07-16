import { ChangeDetectionStrategy, Component, computed, inject, signal, TemplateRef } from '@angular/core';
import { tracked } from '@constants/tracked';
import { User } from '@models/user/user.model';
import { dayjs } from '@constants/dates';
import { UserService } from '@models/user/user.service';
import { GlobalService } from '@models/global.service';
import { environment } from 'src/environments/environment';
import { REFLECTION } from '@constants/constants';
import { NgbDatepickerModule, NgbDateStruct, NgbModal, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { ModalBaseService } from '@app/_modals/modal-base-service';
import { ModalNewUserService } from '@app/_modals/modal-new-user/modal-new-user.component';
import { ModalNewEmploymentComponent } from './modal-new-employment.component';
import { UserEmployment } from '@models/user/user-employment.model';
import { HrTeamService } from '../hr-team/hr-team.service';
import { SmartLinkDirective } from '@directives/smart-link.directive';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { Nx } from '@app/nx/nx.directive';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import { HotkeyDirective } from '@directives/hotkey.directive';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { UlCompactComponent } from '@shards/ul-compact/ul-compact.component';
import { Serializable } from '@models/serializable';
import { TbeRow } from '@models/api-response';

interface TBlocks {
    paid: [number, string][];
    vacation: [number, string][];
    worked: [number, string][];
    excluded: [number, string][];
    month: string;
    delta: number;
    lastDelta: number;
}
const newTBlocks = (month: string): TBlocks => ({ paid: [], vacation: [], worked: [], excluded: [], month: month, delta: 0, lastDelta: 0 });

// A reflected project/company model with the time-based-employment extras the backend attaches.
type TbeProjectRow = Serializable & { path: string; duration: number };

@Component({
    selector: 'hr-employment',
    templateUrl: './hr-employment.component.html',
    styleUrls: ['./hr-employment.component.scss'],
    imports: [SmartLinkDirective, AvatarComponent, DatePipe, DecimalPipe, FormsModule, NgbDatepickerModule, NgbTooltipModule, UlCompactComponent, ToolbarComponent, Nx, AvatarComponent, HotkeyDirective, EmptyStateComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HrEmploymentComponent {
    #parent = inject(HrTeamService);
    #userService = inject(UserService);
    #global = inject(GlobalService);
    #modalService = inject(NgbModal);
    #modal = inject(ModalBaseService);
    #newUserModal = inject(ModalNewUserService);

    protected readonly _user = signal<User | null>(null);

    readonly user = tracked(this._user);
    projects = signal<TbeProjectRow[]>([]);
    employments = signal<UserEmployment[]>([]);
    tblocks = signal<Record<string, TBlocks>>({});
    roles = signal<string[]>([]);
    remOutput = signal(0);

    env = environment;
    remInput = 0;
    addTbeDate: NgbDateStruct = { year: dayjs().year(), month: dayjs().month(), day: 25 };
    addTbeAmount = 0;
    readonly factor = (1 / 160) * 8 * (20 / 12);

    #maxDelta = 0;
    #minDelta = 0;
    #tbe_table: TbeRow[] = [];

    readonly isAdmin = computed(() => this.#global.user?.hasRole('admin') ?? false);
    get minDelta() { return this.#minDelta; }

    constructor() {
        this.#parent.onUserChange.subscribe((user) => {
            this._user.set(user);
            this.projects.set([]);
            this.#tbe_table = [];
            this.reload();
        });
    }

    reload() {
        const user = this.user();
        if (!user) return;
        this.#userService.showTimeBasedEmploymentInfo(user).subscribe((data) => {
            this.projects.set(data.tbe_projects?.map((project) => REFLECTION<TbeProjectRow>(project)) ?? []);
            this.#tbe_table = data.tbe_table ?? [];
            this.employments.set(data.employments.map((_) => UserEmployment.fromJson(_)));
            this.roles.set(data.roles.map((_) => _.name));

            const blocks: Record<string, TBlocks> = {};
            for (const _ of this.#tbe_table) {
                if (!(_.month in blocks)) blocks[_.month] = newTBlocks(_.month);
                if (_.type === 0) {
                    blocks[_.month].worked.push([_.duration, 'actual work time']);
                    blocks[_.month].excluded.push([_.excluded, 'excluded projects']);
                } else if (_.type === 1) {
                    blocks[_.month].paid.push([_.raw, 'paid time']);
                    blocks[_.month].vacation.push([_.vacation, _.description]);
                }
            }
            this.#maxDelta = 0;
            this.#minDelta = 0;
            let delta = 0;
            for (const key of Object.keys(blocks)) {
                blocks[key].lastDelta = delta;
                delta = this.#updateDeltas(delta, -this.getSum(blocks[key].paid));
                delta = this.#updateDeltas(delta, this.getSum(blocks[key].vacation));
                delta = this.#updateDeltas(delta, this.getSum(blocks[key].worked));
                blocks[key].delta = delta;
            }
            this.tblocks.set(blocks);
            if (user.active_employment?.is_time_based) this.updateRem();
        });
    }

    getTbeMonths = () => Object.values(this.tblocks());
    getMax = () => this.#maxDelta - this.#minDelta;
    getPerc = (_: number) => (80 * _) / this.getMax();
    getSum = (_: [number, string][]) => _.map((_) => _[0]).sum();
    hasTimebasedEmployment = () => this.user()?.active_employment?.is_time_based ?? false;

    #updateDeltas = (d: number, change: number) => {
        d += change;
        this.#maxDelta = Math.max(d, this.#maxDelta);
        this.#minDelta = Math.min(d, this.#minDelta);
        return d;
    };

    updateRem() {
        this.remOutput.set((this.remInput + this.getTbeMonths().last()!.delta) / (1 - this.factor));
    }

    open(content: TemplateRef<unknown>) {
        this.#modalService.open(content, { ariaLabelledBy: 'modal-basic-title' });
    }

    async addUser() {
        const data = await this.#newUserModal.open().catch(() => undefined);
        if (!data) return;
        this.#userService.create(data).subscribe();
    }

    onNewEmployment() {
        const user = this.user();
        if (!user) return;
        this.#modal.open(ModalNewEmploymentComponent, user).then((_) => {
            if (_) _.store().subscribe(() => this.reload());
        });
    }

    addTbe = () => {
        const user = this.user();
        if (!user) return;
        const payload = {
            paid_at: this.addTbeDate.year + '-' + this.addTbeDate.month + '-' + this.addTbeDate.day,
            raw: this.addTbeAmount,
            vacation: this.addTbeAmount * this.factor,
        };
        this.#userService.addTbe(user, payload).subscribe(() => {
            this.#modalService.dismissAll();
            this.reload();
        });
    };
}
