import { Injectable } from '@angular/core';
import { User } from 'src/models/user/user.model';
import { NexusHttpService } from '../http/http.nexus';
import { CalendarEntry } from './calendar-entry.model';

@Injectable({ providedIn: 'root' })
export class VCalendarService extends NexusHttpService<User> {

    apiPath = 'calendar_entries'

    getCalendar = () => this.aget('calendar_entries', null, CalendarEntry)
    createCalendarEvent = (calendarEntry: CalendarEntry) => this.post<CalendarEntry>('calendar_entries', calendarEntry)
    updateCalendarEvent = (calendarEntry: CalendarEntry) => this.put<CalendarEntry>(`calendar_entries/${calendarEntry.id}`, calendarEntry)
    deleteEvent =  (calendarEntry: CalendarEntry) => this.delete<CalendarEntry>(`calendar_entries/${calendarEntry.id}`)
}
