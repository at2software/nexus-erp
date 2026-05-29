import moment from 'moment';
import { FocusService } from './focus.service';
import { Serializable } from '../serializable';
import { environment } from 'src/environments/environment';
import { Color } from '@constants/Color';
import { NxAction } from '@app/nx/nx.actions';
import { User } from '../user/user.model';
import { InvoiceItem } from '../invoice/invoice-item.model';
import { Company } from '../company/company.model';
import { Project } from '../project/project.model';
import { NxGlobal } from '@app/nx/nx.global';
import tz from 'moment-timezone';
import { IHasFoci } from './hasFoci.interface';
import { getFocusActions } from './focus.actions';
import { IHasMarker } from '@enums/marker';
import { Type } from 'class-transformer';
import { TypeFromClass, Model } from '@constants/type-discriminators';
import { computed } from '@angular/core';

@Model('Focus')
export class Focus extends Serializable implements IHasMarker {
    static API_PATH = (): string => 'foci';

    static filterByDateRange(foci: Focus[], startDate: moment.Moment, endDate: moment.Moment): Focus[] {
        return foci.filter((f) => startDate.diff(f.momentStarted(), 'seconds') < 0 && endDate.diff(f.momentStarted(), 'seconds') >= 0);
    }
    SERVICE = FocusService;

    duration: number = 0;
    started_at: string = '';
    comment: string | null = null;
    user_id: string = '';
    is_unpaid: boolean = false;
    parent_type?: string;
    parent_id?: string;
    parent_icon?: string;
    parent_name?: string;
    parent_path?: string;
    invoice_item_id?: string;
    invoiced_in_item_id?: string;
    marker: number | null = null;

    /** Stores the User from JSON or set externally. Getter falls back to global user list. */
    #userVal: User | undefined;
    get user(): User | undefined { return this.#userVal ?? NxGlobal.global.userFor(this.user_id); }
    set user(v: any) { this.#userVal = v instanceof User ? v : (v ? User.fromJson(v) : undefined); }
    @Type(() => InvoiceItem) invoice_item!: InvoiceItem;
    @Type(() => InvoiceItem) invoiced_in_item!: InvoiceItem;
    @TypeFromClass() parent!: IHasFoci;

    doubleClickAction: number = 0;
    actions: NxAction[] = getFocusActions(this);

    protected override readonly computedIcon = computed(() => environment.envApi + `users/${this.user_id}/icon`);
    getName = computed(() => this.comment);
    getInvoiceItemColor = computed(() => Color.uniqueColorFromString('' + this.invoice_item_id));
    getInvoicedInItemColor = computed(() => Color.uniqueColorFromString('' + this.invoiced_in_item_id));
    userIcon = computed((): string => environment.envApi + 'users/' + this.user_id + '/icon');
    getParentName = computed(() => (this.isOwnCompany() ? 'Organizational' : (this.parent?.getName() ?? 'Organizational')));
    getParentIcon = computed(() => environment.envApi + this.parent_icon);
    pStart = computed((): string => 100 * this.perc(this.momentStarted()) + '%');
    pEnd = computed((): string => 100 * (1 - this.perc(this.momentEnded())) + '%');
    ref = computed((): string => this.parent?.id || this.user_id || this.invoice_item_id || '');
    momentStarted = computed((): moment.Moment => moment(this.started_at));
    momentEnded = computed((): moment.Moment => moment(this.ended_at));

    setParent = (_: Serializable): any => {
        if (_ instanceof Company) return this.update({ parent_id: _.id, parent_type: 'App\\Models\\Company' }).subscribe();
        if (_ instanceof Project) return this.update({ parent_id: _.id, parent_type: 'App\\Models\\Project' }).subscribe();
        console.error('setting parent class ' + _.class + ' is not implemented yet');
    };
    fixParent() {
        if (this.parent.id !== '') return;
        switch (this.parent_type) {
            case 'App\\Models\\Project':
                this.parent = { id: this.parent_id!, class: 'Project' } as any;
                break;
            case 'App\\Models\\Company':
                this.parent = { id: this.parent_id!, class: 'Company' } as any;
                break;
        }
    }

    get ended_at() {
        return tz.tz(this.started_at, tz.tz.guess()).add(this.duration, 'hours');
    }

    perc = (ts: moment.Moment): number => -ts.clone().startOf('day').diff(ts, 'seconds') / 86400;

    color = (): string => {
        if (this.isOwnCompany()) return '#999999';
        return Color.fromHsl((170 + parseInt(this.ref()) * 161) % 360, 100, 45).toHexString();
    };

    isOwnCompany = () => this.parent?.class == 'Company' && this.parent?.id === NxGlobal.ME_ID;
    isUnpaid = () => this.is_unpaid || this.isOwnCompany();
}
