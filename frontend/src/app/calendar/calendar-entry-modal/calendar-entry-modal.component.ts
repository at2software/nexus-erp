import { Component, OnInit, inject, Input } from '@angular/core';
import { NgbActiveModal, NgbDatepickerModule, NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { CalendarEntry } from 'src/models/vcalendar/calendar-entry.model';
import { RecurrenceType, VCalendarEvent } from 'src/models/vcalendar/vcalendar-event.model';
import * as moment from 'moment-timezone';
import { ConfirmationService } from '@app/_modals/modal-confirm/confirmation.service';

import { FormsModule } from '@angular/forms';

@Component({
    selector: 'calendar-detail',
    templateUrl: './calendar-entry-modal.component.html',
    styleUrls: ['./calendar-entry-modal.component.scss'],
    standalone: true,
    imports: [NgbDatepickerModule, FormsModule]
})
export class CalendarEntryModalComponent implements OnInit {

    isSetUp: boolean = false;
    recurrenceOptions = RecurrenceType;

    daysOfWeek: string[] = [];
    daysOfWeekEn: string[] = [];
    daysOfWeekLong: string[] = [];
    monthNames: string[] = [];

    confirmation = inject(ConfirmationService)

    @Input() calendarEntry?: CalendarEntry;
    @Input() date?: Date;
    editedStartDate: NgbDateStruct;
    editedStartDateTemp: NgbDateStruct;
    editedEndDate?: NgbDateStruct;
    recurringSelectableWeeks: { label: string, asNumber: string }[] = [
        { label: 'first', asNumber: '1' },
        { label: 'second', asNumber: '2' },
        { label: 'third', asNumber: '3' },
        { label: 'fourth', asNumber: '4' },
        { label: 'last', asNumber: '-1' }
    ];
    editedStartTime: { hour: number, minute: number } = { hour: 10, minute: 0 }
    editedStartTimeTemp: { hour: number, minute: number } = { hour: 10, minute: 0 };
    editedEndTime: { hour: number, minute: number } = { hour: 10, minute: 0 }

    constructor(public activeModal: NgbActiveModal) {
      this.generateLocalizedDaysAndMonths();
    }

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

    ngOnInit() {
      if (this.calendarEntry) {
        this.calendarEntry = Object.assign(CalendarEntry.fromJson({}), this.calendarEntry);
        this.calendarEntry.vcalendar_event = Object.assign(new VCalendarEvent(), this.calendarEntry.vcalendar_event);
        this.editedStartDate = this.dateToNgbDateStruct(this.calendarEntry.vcalendar_event.start_date);
        this.editedStartDateTemp = this.editedStartDate;
        this.editedEndDate = this.dateToNgbDateStruct(this.calendarEntry.vcalendar_event.end_date!);
        this.editedStartTime = this.dateToTime(this.calendarEntry.vcalendar_event.start_date);
        this.editedStartTimeTemp = this.editedStartTime
        this.editedEndTime = this.dateToTime(this.calendarEntry.vcalendar_event.end_date!);
        this.isSetUp = true;
      }
      if (this.date) {
        this.calendarEntry = CalendarEntry.fromJson({});
        this.editedStartDate = this.dateToNgbDateStruct(this.date);
        this.editedStartDateTemp = this.editedStartDate;
        this.editedEndDate = this.dateToNgbDateStruct(this.date);
        this.editedStartTime = { hour: 10, minute: 0 }
        this.editedStartTimeTemp = this.editedStartTime
        this.editedEndTime = { hour: 10, minute: 0 }
        this.isSetUp = true;
      }
    }

    dateToNgbDateStruct(date: Date): NgbDateStruct {
        return {
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            day: date.getDate()
        };
    }
    dateToTime(date: Date): { hour: number, minute: number } {
        return {
            hour: date.getHours(),
            minute: date.getMinutes()
        };
    }

    close(deleted: boolean = false) {
        const calendarEntry = CalendarEntry.fromJson({});
        if(!deleted) calendarEntry.vcalendar = this.getEditedVCalendarString();
        if(this.calendarEntry?.id) calendarEntry.id = this.calendarEntry?.id;
        this.activeModal.close(calendarEntry);
    }

    onEditedStartDateChange(newDate: NgbDateStruct) {
        if (!this.editedEndDate) {
            this.editedEndDate = this.editedStartDate;
            return;
        }
        if (this.datesAreEqual(this.editedStartDateTemp, this.editedEndDate)) {
            this.editedEndDate = newDate;
        } else if (this.compareDates(newDate, this.editedEndDate) > 0) {
            this.editedEndDate = newDate;
        }
        this.editedStartDate = newDate;
        this.editedStartDateTemp = this.editedStartDate;
    }
    onEditedEndDateBlur() {
        const newDate = this.editedEndDate!;
        if (!this.editedEndDate) this.editedEndDate = this.editedStartDate;
        if (this.compareDates(this.editedStartDate, newDate) > 0) {
            this.editedStartDate = newDate;
            this.editedStartDateTemp = this.editedStartDate;
        }
        this.editedEndDate = newDate;
    }
    onEditedStartTimeChange() {
        if (!this.editedEndTime) {
            this.editedEndTime = { ...this.editedStartTime };
            return;
        }
        if (this.timesAreEqual(this.editedStartTimeTemp, this.editedEndTime)) {
            this.editedEndTime = { ...this.editedStartTime };
        } else if (this.compareTimes(this.editedStartTime, this.editedEndTime) > 0) {
            this.editedEndTime = { ...this.editedStartTime };
        }
        this.editedStartTimeTemp = { ...this.editedStartTime };
    }
    onEditedEndTimeBlur() {
        this.editedEndTime = this.cleanTime(this.editedEndTime)
        if (this.compareTimes(this.editedStartTime, this.editedEndTime) > 0) {
            this.editedStartTime = { ...this.editedEndTime };
            this.editedStartTimeTemp = { ...this.editedStartTime };
        }
    }
    onEditedStartTimeBlur() {
        this.editedStartTime = this.cleanTime(this.editedStartTime)
        this.onEditedStartTimeChange()
    }
    cleanTime(time: { hour: number, minute: number }) {
        time.hour = Math.floor(this.clamp(time.hour, 0, 23));
        time.minute = Math.floor(this.clamp(time.minute, 0, 59));
        return time;
    }
    clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(value, max));
    }
    datesAreEqual(date1: NgbDateStruct, date2: NgbDateStruct): boolean {
        return date1.year === date2.year && date1.month === date2.month && date1.day === date2.day;
    }
    timesAreEqual(time1: { hour: number, minute: number }, time2: { hour: number, minute: number }): boolean {
        return time1.hour === time2.hour && time1.minute === time2.minute;
    }
    compareDates(date1: NgbDateStruct, date2: NgbDateStruct): number {
        const d1 = new Date(date1.year, date1.month - 1, date1.day);
        const d2 = new Date(date2.year, date2.month - 1, date2.day);
        return d1.getTime() - d2.getTime();
    }
    compareTimes(time1: { hour: number, minute: number }, time2: { hour: number, minute: number }): number {
        const d1 = new Date();
        const d2 = new Date();
        d1.setHours(time1.hour, time1.minute, 0, 0);
        d2.setHours(time2.hour, time2.minute, 0, 0);
        return d1.getTime() - d2.getTime();
    }


    getEditedVCalendarString(): string {
        if (!this.calendarEntry) return '';
        const vcalendarEvent = this.calendarEntry.vcalendar_event;
        const dtStart = this.formatDate(this.editedStartDate, this.editedStartTime, vcalendarEvent.entire_day);
        const dtEnd = this.editedEndDate ? this.formatDate(this.editedEndDate, this.editedEndTime, vcalendarEvent.entire_day, true) : '';
        const rruleByDay = vcalendarEvent.isWeekdayDependent && vcalendarEvent.rrule == RecurrenceType.Monthly && vcalendarEvent.byDayOccurence && vcalendarEvent.byDayWeekday ? ';BYDAY=' + vcalendarEvent.byDayOccurence + vcalendarEvent.byDayWeekday : '';

        const vCalendar =
            "BEGIN:VCALENDAR\n" +
            "VERSION:2.0\n" +
            "BEGIN:VEVENT\n" +
            (vcalendarEvent.uid ? "UID:" + vcalendarEvent.uid + "\n" : "") +
            "SUMMARY:" + vcalendarEvent.title + "\n" +
            (vcalendarEvent.description ? "DESCRIPTION:" + vcalendarEvent.description + "\n" : "") +
            (vcalendarEvent.rrule != RecurrenceType.None ? "RRULE:" + vcalendarEvent.rrule + rruleByDay + "\n" : "") +
            "DTSTART" + dtStart + "\n" +
            (this.editedEndDate && dtStart != dtEnd ? "DTEND" + dtEnd + "\n" : "") +
            "END:VEVENT\n" +
            "END:VCALENDAR";

        return vCalendar;
    }
    formatDate(ngbDate: NgbDateStruct, time?: { hour: number, minute: number }, entireDay: boolean = false, isEndDate: boolean = false): string {
        if (entireDay) {
            let year = ngbDate.year;
            let month = ngbDate.month;
            let day = ngbDate.day;

            if (isEndDate) {
                const jsDate = new Date(year, month - 1, day);
                jsDate.setDate(jsDate.getDate() + 1);
                year = jsDate.getFullYear();
                month = jsDate.getMonth() + 1;
                day = jsDate.getDate();
            }

            const yearString = year.toString();
            const monthString = month.toString().padStart(2, '0');
            const dayString = day.toString().padStart(2, '0');
            return ':' + yearString + monthString + dayString;
        }
        const date = new Date(ngbDate.year, ngbDate.month - 1, ngbDate.day, time?.hour || 0, time?.minute || 0);
        const timezone = this.getLocalTimezone();
        const momentDate = moment.tz(date, timezone);
        const formattedDate = momentDate.format("YYYYMMDDTHHmmss");
        return `;TZID=${timezone}:${formattedDate}`;;
    }
    getLocalTimezone(): string {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
    onDelete() {
        this.confirmation.confirm({ title: 'Attention', message: 'Do you really want to delete this calendar item?'})
            .then(response => {
                if (response) {
                    this.close(true);
                }
            })
            .catch()
    }
}
