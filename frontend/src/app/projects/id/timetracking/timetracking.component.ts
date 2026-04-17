import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Focus } from 'src/models/focus/focus.model';
import { Observable, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { FocusService } from 'src/models/focus/focus.service';
import { User } from 'src/models/user/user.model';
import { GlobalService } from 'src/models/global.service';
import { IHasFociGuard } from '@models/focus/hasFoci.interface';
import { InvoiceItemType } from 'src/enums/invoice-item.type';
import { StartEnd } from '@constants/constants';
import moment from 'moment';
import { InvoiceItem } from '@models/invoice/invoice-item.model';

@Component({
    template: '',
    imports: [],
    standalone: true
})
export abstract class TimetrackingComponent implements OnInit {

    abstract parent: IHasFociGuard

    observer: Observable<Focus[]>
    filteredFoci: Focus[] = []
    users:any[] = []
    filteredUsers:User[] = []
    selection: Focus[] = []
    selectionDuration: number
    sortField: string = 'started_at'
    sortDirection: 'asc' | 'desc' = 'desc'
    displayedColumns = ['started_at', 'timespan', 'userIcon', 'comment', 'duration', 'invoiced', 'focus_item']

    // New filter properties
    showNotYetInvoiced: boolean = false
    dateRange?: StartEnd
    #dateRangeChange$ = new Subject<void>()
    #destroyRef = inject(DestroyRef)

    protected focusService = inject(FocusService)
    #global = inject(GlobalService)

    ngOnInit(): void {
        this.parent.onChange.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
            this.setupUsersFromWorkShares()
            this.reload()
        })
        this.#global.onSelectionIn(() => this.filteredFoci, 'duration').subscribe(_ => {
            [this.selection, this.selectionDuration] = _
        })

        // Debounce date range changes to prevent duplicate reloads
        this.#dateRangeChange$.pipe(debounceTime(300)).subscribe(() => this.reload())

        if (this.parent.current) this.setupUsersFromWorkShares()
    }
    onReload = () => {
        const selectedUserIds = this.users.filter(u => !u.var.hidden).map(u => u.id)

        // Prepare date range parameters
        let startDate: string | undefined
        let endDate: string | undefined
        if (this.dateRange?.startDate) {
            startDate = moment((this.dateRange.startDate as any).$d).format('YYYY-MM-DD')
        }
        if (this.dateRange?.endDate) {
            endDate = moment((this.dateRange.endDate as any).$d).format('YYYY-MM-DD')
        }
        return this.focusService.getFociFor(
            this.parent.current as any,
            selectedUserIds.length ? selectedUserIds : undefined,
            this.sortField,
            this.sortDirection,
            this.showNotYetInvoiced,
            startDate,
            endDate
        )
    }

    reload = () => {
        this.parent.current.foci = []
        this.filteredFoci = []
        this.observer = this.onReload()
    }
    userForFocus = (x:Focus) => this.#global.userFor(x.user_id)
    durationFor = (user:User) => this.parent.current.foci.filter(_ => _.user_id === user.id).reduce((a,b) => a + b.duration ,0)
    getTotal = () => this.filteredFoci.reduce((a,b) => a + b.duration ,0)

    setupUsersFromWorkShares() {
        const timeline_chart = (this.parent.current as any)?.timeline_chart
        if (timeline_chart?.length) {
            this.users = timeline_chart.map((foci: any) => User.fromJson(foci.user))
            this.filteredUsers = [...this.users]
        } else {
            this.users = this.filteredUsers = []
        }
    }
    onResult = (data:any) => {
        this.parent.current.foci = this.parent.current.foci
            .concat(data as Focus[])
            .map(_ => {
                _.parent = this.parent.current
                return _
            })

        let focusItems:InvoiceItem[] = [];
        if ('invoice_items' in this.parent.current) {
            focusItems = this.parent.current.invoice_items as InvoiceItem[];
        } else {
            focusItems = this.parent.current.foci
                .filter(focus => focus.invoice_item?.type == InvoiceItemType.Default && focus.invoice_item?.text.length)
                .map(focus => focus.invoice_item)
                .filter((item, index, arr) => arr.findIndex(i => i.id === item.id) === index)
        }

        this.parent.current.foci.forEach(focus => {
            if (!focus.var.hasAdditionalFocusActions) {
                focus.var.hasAdditionalFocusActions = true
                focus.actions.push({
                    title: $localize`:@@i18n.foci.changeFocus:change focus...`,
                    group: true,
                    children: focusItems
                        .filter(_ => _ && _.text)
                        .map(_ => ({
                            title: this.#decodeHtmlEntities(_.text),
                            group: true,
                            action: () => focus.update({ invoice_item_id: _.id })
                        }))
                })
            }
        })

        this.applyUserFilters()
    }

    applyUserFilters = () => this.filteredFoci = [...this.parent.current.foci]
    findUniqueUser = (u:User) => this.users.find(_ => _.id === u.id)
    onFilterChanged(u:User) {
        u.var.hidden = !u.var.hidden
        this.reload()
    }

    onSort(field: string) {
        if (this.sortField === field) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc'
        } else {
            this.sortField = field
            this.sortDirection = (field === 'started_at' || field === 'duration') ? 'desc' : 'asc'
        }
        this.reload()
    }

    getSortIcon = (field: string): string => this.sortField !== field ? '<i>unfold_more</i>' :
        this.sortDirection === 'asc' ? '<i>expand_less</i>' : '<i>expand_more</i>'

    #decodeHtmlEntities = (text: string): string => {
        const div = document.createElement('div')
        div.innerHTML = text
        return div.textContent || ''
    }

    // New filter methods
    onNotYetInvoicedFilterChange() {
        this.reload()
    }

    onDateRangeChange() {
        this.#dateRangeChange$.next()
    }

}
