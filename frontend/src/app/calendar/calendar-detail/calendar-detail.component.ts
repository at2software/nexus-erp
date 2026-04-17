import { Component, OnInit, OnDestroy, ElementRef, ViewChild, HostListener, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { NgbModal, NgbModalRef, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { CalendarEntry } from 'src/models/vcalendar/calendar-entry.model';
import { RecurrenceType, VCalendarEvent, Weekday } from 'src/models/vcalendar/vcalendar-event.model';
import { VCalendarService } from 'src/models/vcalendar/vcalendar.service';
import { ConfirmationService } from '@app/_modals/modal-confirm/confirmation.service';
import { NxGlobal, TBroadcast } from '@app/nx/nx.global';
import { CalendarEntryModalComponent } from '../calendar-entry-modal/calendar-entry-modal.component';
import { HeaderModule } from '@app/app/header/header.module';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Nx } from '@app/nx/nx.directive';

interface EventSpan {
    calendarEntry: CalendarEntry;
    startDay: number;
    endDay: number;
    row: number;
}

@Component({
    selector: 'calendar-detail',
    templateUrl: './calendar-detail.component.html',
    styleUrls: ['./calendar-detail.component.scss'],
    standalone: true,
    imports: [HeaderModule, ToolbarComponent, FormsModule, CommonModule, NgbTooltipModule, Nx]
})
export class CalendarDetailComponent implements OnInit, OnDestroy {
    @ViewChild('popupButton', { static: false }) popupButton!: ElementRef;
    @ViewChild('popup', { static: false }) popup!: ElementRef;

    #modalService = inject(NgbModal)

    isPopupOpen = false;
    popupStyles: { top: string; right: string } = { top: '0px', right: '0px' };
    recurrenceOptions = RecurrenceType;

    daysOfWeek: string[] = [];
    daysOfWeekEn: string[] = [];
    daysOfWeekLong: string[] = [];
    monthNames: string[] = [];
    selectedMonth: number = new Date().getMonth();
    year: number = new Date().getFullYear();
    yearRange: number[] = [];
    calendar: Date[][] = [];
    calendarEvents: CalendarEntry[][][] = [];
    eventSpans: EventSpan[][] = [];
    weekEventCounts: number[] = [];
    hoveredEventId: string = '';

    calendarEntries: CalendarEntry[] = [];
    calendarEntriesByDate = new Map<string, CalendarEntry[]>();
    #vCalendarService = inject(VCalendarService)
    #broadcastSub?: Subscription


    confirmation = inject(ConfirmationService)

    constructor() {
        this.generateLocalizedDaysAndMonths()
    }

    ngOnDestroy() {
        this.#broadcastSub?.unsubscribe()
    }

    ngOnInit(): void {
        this.#broadcastSub = NxGlobal.broadcast$.subscribe(({ type, data }) => {
            if (type === TBroadcast.Delete && data instanceof CalendarEntry) {
                const index = this.calendarEntries.findIndex(e => e.id === data.id)
                if (index >= 0) this.calendarEntries.splice(index, 1)
                this.groupEventsByDate()
                this.setCalendarEntriesPerDate()
            }
        })
        this.#vCalendarService.getCalendar().subscribe(_ => {
            this.parseVCalendarEvents(_)
            this.groupEventsByDate()
            this.setCalendarEntriesPerDate()
        })
        this.generateYearRange()
        this.updateCalendarLayout()
        this.setCalendarEntriesPerDate()
        this.selectedMonth = new Date().getMonth();
    }

    update(): void {
        this.updateCalendarLayout();
        this.groupEventsByDate();
        this.generateYearRange();
        this.setCalendarEntriesPerDate();
    }
    isActiveMenu = (i:number) => i === this.selectedMonth

    generateLocalizedDaysAndMonths(): void {
        const locale = navigator.language || 'en-US';

        this.monthNames = Array.from({ length: 12 }, (_, i) =>
            new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(2000, i, 1))
        );

        const weekStart = new Date(2024, 0, 1);
        this.daysOfWeek = Array.from({ length: 7 }, (_, i) => {
            const currentDate = new Date(weekStart);
            return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(currentDate.setDate(currentDate.getDate() + (i === 0 ? 0 : i))));
        });
        this.daysOfWeekEn = Array.from({ length: 7 }, (_, i) => {
            const currentDate = new Date(weekStart);
            return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(new Date(currentDate.setDate(currentDate.getDate() + (i === 0 ? 0 : i)))).substring(0, 2).toUpperCase();
        });
        this.daysOfWeekLong = Array.from({ length: 7 }, (_, i) => {
            const currentDate = new Date(weekStart);
            return new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(new Date(currentDate.setDate(currentDate.getDate() + (i === 0 ? 0 : i))));
        });
    }

    selectMonth(index: number): void {
        this.selectedMonth = index
        this.update()
    }
    updateYear = (value: string) => this.year = parseInt(value);

    previousYear(): void {
        this.year--
        this.update()
    }

    nextYear(): void {
        this.year++
        this.update()
    }

    generateYearRange(): void {
        const startYear = this.year - 10;
        const endYear = this.year + 10;
        this.yearRange = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
    }

    updateCalendarLayout(): void {
        this.calendar = [];

        const firstDayOfMonth = new Date(this.year, this.selectedMonth, 1).getDay();
        const daysInMonth = new Date(this.year, this.selectedMonth + 1, 0).getDate();
        const daysInPrevMonth = new Date(this.year, this.selectedMonth, 0).getDate();

        const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
        let date = 1;
        let nextMonthDate = 1;

        for (let i = 0; i < 6; i++) {
            const week: Date[] = [];

            for (let j = 0; j < 7; j++) {
                if (i === 0 && j < startDay) {
                    week.push(new Date(this.year, this.selectedMonth - 1, daysInPrevMonth - startDay + j + 1));
                } else if (date > daysInMonth) {
                    week.push(new Date(this.year, this.selectedMonth + 1, nextMonthDate));
                    nextMonthDate++;
                } else {
                    week.push(new Date(this.year, this.selectedMonth, date));
                    date++;
                }
            }

            this.calendar.push(week);
        }
    }

    isToday = (date: Date): boolean => date.toDateString() === (new Date()).toDateString();
    isThisYear = (year: number): boolean => year === new Date().getFullYear();
    isThisMonth = (month: number): boolean => month === new Date().getMonth();

    parseVCalendarEvents(calendarEntries: CalendarEntry[]): void {
        this.calendarEntries.push(...calendarEntries.map((calendarEntry) => {
            calendarEntry.vcalendar_event = VCalendarEvent.extractEventData(calendarEntry.vcalendar);
            return calendarEntry;
        }));
    }

    groupEventsByDate(): void {
        this.calendarEntriesByDate.clear();

        for (const calendarEntry of this.calendarEntries) {
            if (calendarEntry && calendarEntry.vcalendar_event) {
                const eventStartDate = calendarEntry.vcalendar_event.start_date;
                const eventEndDate = calendarEntry.vcalendar_event.end_date ?? eventStartDate;

                const rrule = calendarEntry.vcalendar_event.rrule;
                if (rrule !== RecurrenceType.None) {
                    switch (rrule) {
                        case RecurrenceType.Weekly:
                            this.#handleWeeklyRecurrence(eventStartDate, eventEndDate, calendarEntry);
                            break;
                        case RecurrenceType.Monthly:
                            this.#handleMonthlyRecurrence(eventStartDate, eventEndDate, calendarEntry);
                            break;
                        case RecurrenceType.Yearly:
                            this.#handleYearlyRecurrence(eventStartDate, eventEndDate, calendarEntry);
                            break;
                    }
                } else {
                    this.#addEventToDateRange(eventStartDate, eventEndDate, calendarEntry);
                }
            }
        }
    }
    #addEventToDateRange(startDate: Date, endDate: Date, calendarEntry: CalendarEntry): void {
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const dateStr = currentDate.toLocaleDateString('en-GB').split('/').reverse().join('-');

            if (!this.calendarEntriesByDate.has(dateStr)) {
                this.calendarEntriesByDate.set(dateStr, []);
            }
            this.calendarEntriesByDate.get(dateStr)!.push(calendarEntry);

            currentDate.setDate(currentDate.getDate() + 1);
        }
    }

    #handleWeeklyRecurrence(eventStartDate: Date, eventEndDate: Date, calendarEntry: any): void {
        const eventMonthDayStart = eventStartDate.toLocaleDateString('en-GB').split('/').reverse().join('-').substring(5, 10);

        const startDate = new Date(`${this.year}-${eventMonthDayStart}`);
        startDate.setHours(0);
        startDate.setMinutes(0);
        startDate.setSeconds(0);
        startDate.setMilliseconds(0);
        const duration = (eventEndDate.getTime() - eventStartDate.getTime()) / (1000 * 3600 * 24);

        this.calendar.forEach(week => {
            week.forEach(day => {
                if (day.getDay() === startDate.getDay()) {
                    const recurringStartDate = new Date(day);
                    const recurringEndDate = new Date(day);
                    recurringEndDate.setDate(recurringEndDate.getDate() + duration);

                    if (recurringStartDate >= startDate) {
                        this.#addEventToDateRange(recurringStartDate, recurringEndDate, calendarEntry);
                    }
                }
            });
        });
    }
    #isLastWeekdayOfMonth(day: Date): boolean {
        const dayDate = day.getDate()
        const month = day.getMonth();
        const year = day.getFullYear();

        const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
        return dayDate + 7 > lastDayOfMonth;
    }

    #handleMonthlyRecurrence(eventStartDate: Date, eventEndDate: Date, calendarEntry: any): void {
        const eventMonthDayStart = eventStartDate.toLocaleDateString('en-GB').split('/').reverse().join('-').substring(5, 10);

        if (calendarEntry.vcalendar_event.isWeekdayDependent && calendarEntry.vcalendar_event.byDayOccurence && calendarEntry.vcalendar_event.byDayWeekday) {
            const startDate = new Date(`${this.year}-${eventMonthDayStart}`);
            startDate.setHours(0);
            startDate.setMinutes(0);
            startDate.setSeconds(0);
            startDate.setMilliseconds(0);
            const duration = (eventEndDate.getTime() - eventStartDate.getTime()) / (1000 * 3600 * 24);

            this.calendar.forEach(week => {
                week.forEach(day => {
                    const weekdayMapping = {
                        'SU': 0, 'MO': 1, 'TU': 2, 'WE': 3,
                        'TH': 4, 'FR': 5, 'SA': 6
                    };
                    const targetWeekday = weekdayMapping[calendarEntry.vcalendar_event.byDayWeekday as Weekday];
                    const targetOccurrence = Number(calendarEntry.vcalendar_event.byDayOccurence);
                    const dayWeekday = day.getDay();
                    if (dayWeekday === targetWeekday) {
                        const dayDate = day.getDate();
                        if (Math.ceil(dayDate / 7) == targetOccurrence || (targetOccurrence == -1 && this.#isLastWeekdayOfMonth(day))) {
                            const recurringStartDate = new Date(day);
                            const recurringEndDate = new Date(day);
                            recurringEndDate.setDate(recurringEndDate.getDate() + duration);

                            if (recurringStartDate >= startDate) {
                                this.#addEventToDateRange(recurringStartDate, recurringEndDate, calendarEntry);
                            }
                        }
                    }
                });
            });
        } else {
            const startDate = new Date(`${this.year}-${eventMonthDayStart}`);
            startDate.setHours(0);
            startDate.setMinutes(0);
            startDate.setSeconds(0);
            startDate.setMilliseconds(0);
            const duration = (eventEndDate.getTime() - eventStartDate.getTime()) / (1000 * 3600 * 24);

            this.calendar.forEach(week => {
                week.forEach(day => {
                    if (day.getDate() === startDate.getDate()) {
                        const recurringStartDate = new Date(day);
                        const recurringEndDate = new Date(day);
                        recurringEndDate.setDate(recurringEndDate.getDate() + duration);

                        if (recurringStartDate >= startDate) {
                            this.#addEventToDateRange(recurringStartDate, recurringEndDate, calendarEntry);
                        }
                    }
                });
            });
        }
    }
    #handleYearlyRecurrence(eventStartDate: Date, eventEndDate: Date, calendarEntry: any): void {
        const eventMonthDayStart = eventStartDate.toLocaleDateString('en-GB').split('/').reverse().join('-').substring(5, 10);
        const eventMonthDayEnd = eventEndDate.toLocaleDateString('en-GB').split('/').reverse().join('-').substring(5, 10);

        const recurringStartDate = new Date(`${this.year}-${eventMonthDayStart}`);
        const recurringEndDate = new Date(`${this.year}-${eventMonthDayEnd}`);

        if (recurringStartDate >= eventStartDate) {
            this.#addEventToDateRange(recurringStartDate, recurringEndDate, calendarEntry);
        }
    }


    setCalendarEntriesPerDate() {
        this.calendarEvents = this.calendar.map((week, weekIndex) =>
            week.map((day, dayIndex) => this.getCalendarEntriesForDate(day, weekIndex * 7 + dayIndex))
        );
        this.calculateEventSpans();
    }

    calculateEventSpans() {
        this.eventSpans = this.calendar.map((week, weekIndex) => {
            
            // Collect all unique events for this week
            const weekEvents = new Map<string, { entry: CalendarEntry, days: number[] }>();
            
            week.forEach((day, dayIndex) => {
                const dayEvents = this.calendarEvents[weekIndex][dayIndex];
                dayEvents.forEach(event => {
                    const eventId = event.vcalendar_event!.uid;
                    if (!weekEvents.has(eventId)) {
                        weekEvents.set(eventId, { entry: event, days: [] });
                    }
                    weekEvents.get(eventId)!.days.push(dayIndex);
                });
            });
            
            // Convert to spans and assign rows
            const spans: EventSpan[] = [];
            weekEvents.forEach(({ entry, days }) => {
                const sortedDays = days.sort((a, b) => a - b);
                spans.push({
                    calendarEntry: entry,
                    startDay: sortedDays[0],
                    endDay: sortedDays[sortedDays.length - 1],
                    row: -1 // Will be assigned later
                });
            });
            
            // Sort spans by start day, then by event start time
            spans.sort((a, b) => {
                if (a.startDay !== b.startDay) {
                    return a.startDay - b.startDay;
                }
                const timeA = a.calendarEntry.vcalendar_event?.start_date || new Date();
                const timeB = b.calendarEntry.vcalendar_event?.start_date || new Date();
                return timeA.getTime() - timeB.getTime();
            });
            
            // Assign rows using a greedy algorithm
            const rowOccupancy: { start: number, end: number }[] = [];
            
            spans.forEach(span => {
                let assignedRow = 0;
                
                // Find the first row that doesn't conflict
                while (true) {
                    const conflict = rowOccupancy[assignedRow] && 
                        !(span.startDay > rowOccupancy[assignedRow].end || span.endDay < rowOccupancy[assignedRow].start);
                    
                    if (!conflict) {
                        span.row = assignedRow;
                        rowOccupancy[assignedRow] = { start: span.startDay, end: span.endDay };
                        break;
                    }
                    assignedRow++;
                }
            });
            return spans;
        });
        
        // Calculate the maximum number of rows for each week
        this.weekEventCounts = this.eventSpans.map(weekSpans => {
            const maxRow = weekSpans.reduce((max, span) => Math.max(max, span.row), -1);
            return maxRow + 1; // +1 because rows are 0-indexed
        });
    }

    getWeekHeight(weekIndex: number): string {
        const baseHeight = 80; // Base height for date number and padding
        const eventRowHeight = 24; // Height per event row (including gap)
        const eventCount = this.weekEventCounts[weekIndex] || 0;
        const totalHeight = baseHeight + (eventCount * eventRowHeight);
        return `${totalHeight}px`;
    }

    getWeekTopPosition(weekIndex: number): string {
        const headerHeight = 40; // Approximate height of table header
        const marginTop = 16; // mt-3 margin
        let totalHeight = headerHeight + marginTop;
        
        // Add heights of all previous weeks
        for (let i = 0; i < weekIndex; i++) {
            const baseHeight = 80;
            const eventRowHeight = 24;
            const eventCount = this.weekEventCounts[i] || 0;
            totalHeight += baseHeight + (eventCount * eventRowHeight);
        }
        return `${totalHeight}px`;
    }

    getEventTypeClass(calendarEntry: CalendarEntry): string {
        const description = calendarEntry.vcalendar_event?.description || '';
        
        if (description.toLowerCase().includes('vacation of')) {
            return 'event-vacation';
        } else if (description.toLowerCase().includes('birthday of')) {
            return 'event-birthday';
        } else {
            return 'event-regular';
        }
    }
    getCalendarEntriesForDate(date: Date, _index?: number): CalendarEntry[] {
        const dateStr = date.toLocaleDateString('en-GB').split('/').reverse().join('-');
        const calendarEntries = this.calendarEntriesByDate.get(dateStr) || [];
        return calendarEntries.sort((a, b) => {
            const dateA = a?.vcalendar_event?.start_date ? new Date(a.vcalendar_event.start_date) : null;
            const dateB = b?.vcalendar_event?.start_date ? new Date(b.vcalendar_event.start_date) : null;
            if (dateA && dateB) {
                return dateA.getTime() - dateB.getTime();
            } else if (dateA) {
                return -1;
            } else if (dateB) {
                return 1;
            } else {
                return 0;
            }
        });
    }


    togglePopup() {
        this.isPopupOpen = !this.isPopupOpen;

        if (this.isPopupOpen) {
            const buttonRect = this.popupButton.nativeElement.getBoundingClientRect();

            this.popupStyles = {
                top: `${buttonRect.bottom + window.scrollY}px`,
                right: `0px`
            };

            setTimeout(() => this.adjustPopupPosition(), 0);
        }
    }
    adjustPopupPosition() {
        if (!this.popup) return;

        this.popupStyles = {
            top: `${(this.popupButton.nativeElement as HTMLElement).offsetTop + (this.popupButton.nativeElement as HTMLElement).offsetHeight}px`,
            right: `0`
        };
    }
    @HostListener('document:click', ['$event'])
    closePopup(event: Event) {
        if (
            this.isPopupOpen &&
            this.popup &&
            !this.popup.nativeElement.contains(event.target) &&
            !this.popupButton.nativeElement.contains(event.target)
        ) {
            this.isPopupOpen = false;
        }
    }

    addNewCalendarEntry($event: Event, date: Date) {
        $event.stopPropagation();
        const modalRef = this.#modalService.open(CalendarEntryModalComponent, { ariaLabelledBy: 'modal-basic-title' });
        modalRef.componentInstance.date = date
        this.open(modalRef)
    }
    editCalendarEntry($event: Event, calendarEntry: CalendarEntry) {
        $event.stopPropagation();
        const modalRef = this.#modalService.open(CalendarEntryModalComponent, { ariaLabelledBy: 'modal-basic-title' });
        modalRef.componentInstance.calendarEntry = calendarEntry
        this.open(modalRef)
    }
    open(modalRef: NgbModalRef) {
        modalRef.result.then(
            (calendarEntry) => {
                if(calendarEntry.vcalendar == undefined){
                    this.#vCalendarService.deleteEvent(calendarEntry).subscribe(_ => {
                        const index = this.calendarEntries.findIndex(entry => entry.id === calendarEntry.id);
                        if (index >= 0) {
                            this.calendarEntries.splice(index, 1);
                        }
                        this.groupEventsByDate();
                        this.setCalendarEntriesPerDate();
                    })
                } else {
                    calendarEntry.save().subscribe((updatedCalendarEntry: CalendarEntry) =>{
                        const index = this.calendarEntries.findIndex(entry => entry.id === updatedCalendarEntry.id);
                        if (index !== -1) {
                            this.calendarEntries[index] = updatedCalendarEntry;
                        } else {
                            this.calendarEntries.push(updatedCalendarEntry);
                        }
                        this.groupEventsByDate();
                        this.setCalendarEntriesPerDate();
                    })
                }
            }
        )
    }
}
