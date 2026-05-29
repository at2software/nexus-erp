import moment from 'moment';
import { InvoiceService } from '@models/invoice/invoice.service';
import { Company } from '../company/company.model';
import { Serializable } from '../serializable';
import { InvoiceItem } from './invoice-item.model';
import { getInvoiceActions } from './invoice.actions';
import { HasInvoiceItems } from '@interfaces/hasInvoiceItems.interface';
import { NxGlobal } from '@app/nx/nx.global';
import { InvoiceReminder } from './invoice-reminder.model';
import { map } from 'rxjs';
import { IHasMarker } from '@enums/marker';
import { Type } from 'class-transformer';
import { Model } from '@constants/type-discriminators';
import { computed } from '@angular/core';


@Model('Invoice')
export class Invoice extends Serializable implements HasInvoiceItems, IHasMarker {
    static API_PATH = (): string => 'invoices';
    static WEBSOCKET_KEY = (): string => 'Invoice';
    SERVICE = InvoiceService;

    marker: number | null = null;

    due_at: string | null = null;
    paid_at: string | null = null;
    remind_at: string | null = null;
    company_id: string = '';
    file_id: string = '';
    name: string = '';
    default_interest: number = 0;
    net: number = 0;
    gross: number = 0;
    gross_remaining: number = 0;
    vat: number = 0;
    is_cancelled: boolean = false;
    is_booked: boolean = false;
    stage: number = 0;
    sent: number = 0;

    is_overdue = computed(() => moment(this.snapshot().remind_at).isBefore(moment()) && !this.snapshot().paid_at);
    needs_reminder = computed(() => !this.snapshot().paid_at && moment(this.snapshot().remind_at).isBefore(moment()));
    since = computed(() => -moment(this.snapshot().created_at).diff(moment(), 'days'));
    span = computed(() => moment(this.snapshot().remind_at).diff(moment(this.snapshot().created_at), 'days'));
    progress = computed(() => { const s = this.since(), sp = this.span(); return this.snapshot().paid_at ? 1 : s / sp; });
    progress_abs = computed(() => '' + 100 * this.progress());
    css = computed(() => this.#getColorCss());

    @Type(()=>Invoice) cancelled_by!: Invoice;
    @Type(()=>Invoice) cancelles!: Invoice;
    @Type(()=>Company) company!: Company;
    @Type(()=>InvoiceItem) invoice_items!: InvoiceItem[];
    @Type(()=>InvoiceReminder) reminders!: InvoiceReminder[];

    doubleClickAction: number = 0;
    actions = getInvoiceActions(this);

    override readonly badge = computed(() => this.is_overdue() ? ['bg-danger', 'overdue'] as [string, string] : undefined);

    frontendUrl = (): string => `/financial/${this.id}`;
    companyId = () => this.company_id;
    setPaid = () => this.update({ paid: true });
    setUnpaid = () => this.update({ paid: false });
    getName = () => this.name;
    time_due = (): moment.Moment => moment(this.due_at);
    time_remind = (): moment.Moment => moment(this.remind_at);
    time_paid = (): moment.Moment => moment(this.paid_at);

    getOverdueColor(): string {
        const daysOverdue = moment().diff(this.time_remind(), 'days');
        if (daysOverdue < NxGlobal.global.setting('INVOICE_GRACE_PERIOD')) return 'orange';
        return 'danger';
    }

    static formattedInvoiceNumber = (current?: string): string => {
        const prefix = NxGlobal.global.setting('INVOICE_NO_PREFIX');
        const suffix = NxGlobal.global.setting('INVOICE_NO_SUFFIX');
        const digits = NxGlobal.global.setting('INVOICE_NO_DIGITS');
        if (!current) current = '' + NxGlobal.global.setting('INVOICE_NO_CURRENT');
        while (current!.length < digits) current = '0' + current;
        return prefix + current + suffix;
    };

    isLatestInvoice(): boolean {
        const current = parseInt(NxGlobal.global.setting('INVOICE_NO_CURRENT')) - 1;
        return this.name === Invoice.formattedInvoiceNumber(`${current}`);
    }

    #getColorCss(): string {
        if (this.snapshot().is_cancelled) return 'dark';
        if (this.snapshot().paid_at) return 'success';
        return 'teal';
    }

    d_left = (): number => (this.paid_at ? this.time_paid().diff(this.momentCreated(), 'days') : this.time_remind().diff(moment(), 'days'));
    s_due = (): string => this.time_due().format('DD.MM.YYYY');
    state = (): string => {
        if (this.is_cancelled) return 'cancelled';
        if (this.paid_at) return 'paid';
        if (this.time_remind().diff(moment()) > 0) return 'unpaid';
        return 'unpaid (overdue)';
    };

    cancel = () => NxGlobal.service.post('invoices/' + this.id + '/cancel');
    undo = () => NxGlobal.service.put(`invoices/${this.id}/undo`);
    updateValues = () => NxGlobal.service.put(`invoices/${this.id}/update-values`);
    sendToDatev = () => NxGlobal.service.post(`invoices/${this.id}/datev`).pipe(map((_: any) => this.fromJson(_)));
    sendMail = () => NxGlobal.service.post(`invoices/${this.id}/send-mail`).pipe(map((_: any) => this.fromJson(_)));
    sendReminder = () => NxGlobal.service.post(`invoices/${this.id}/send-reminder`).pipe(map((_: any) => this.fromJson(_)));

    // static helpers
    static aggregate = (_: Invoice[], format: string = 'YYYY'): Record<string, number> =>
        _.reduce((x: any, i: Invoice) => {
            const f = i.momentCreated().format(format);
            x[f] = (x[f] || 0) + i.net;
            return x;
        }, {});
}
