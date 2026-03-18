

import { Vacation } from '../vacation/vacation.model';

export enum RecurrenceType {
  None = 'None',
  Weekly = 'FREQ=WEEKLY',
  Monthly = 'FREQ=MONTHLY',
  Yearly = 'FREQ=YEARLY'
}

export type Weekday = 'SU' | 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA';

export class VCalendarEvent {
    uid: string;
    title: string;
    description: string;
    start_date: Date;
    end_date: Date;
    rrule: RecurrenceType = RecurrenceType.None;
    isWeekdayDependent: boolean = false;
    byDayOccurence?: string = '1';
    byDayWeekday?: Weekday = 'MO';
    entire_day: boolean;
    icon?: string;

    get time() {
        if (!this.entire_day) {
            return this.start_date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return null;
    }

    static extractEventData(vcalString: string, isEditable: boolean = false): VCalendarEvent {
      const uid = this.extractValue(vcalString, "UID");
      const title = this.extractValue(vcalString, "SUMMARY") ?? '';
      let description = this.extractValue(vcalString, "DESCRIPTION") ?? '';
      const dtstartResult = this.extractDate(vcalString, "DTSTART")
          ?? this.extractDate(vcalString, "VALUE=DATE")
          ?? { date: new Date(), entireDay: false };

      const { date: dtstart, entireDay } = dtstartResult;
      const { date: dtend } = this.extractDate(vcalString, "DTEND") ?? { date: new Date(dtstart) };
      const rrule = this.extractValue(vcalString, "RRULE");
      const recurrence = this.parseRRule(rrule!);
      if (entireDay && !this.isSameDay(dtstart, dtend)) dtend.setDate(dtend.getDate() - 1);

      let icon: string | undefined;
      if (!isEditable) {
          description = title;
          // Detect event type and assign appropriate Material Icon
          if (title.toLowerCase().includes('vacation of')) {
              icon = Vacation.VACATION_ICON;
          } else if (title.toLowerCase().includes('birthday of')) {
              icon = 'cake';
          }
          // Keep original title without emoji replacements
      }

      const obj: any = {
          uid,
          title,
          description,
          start_date: dtstart,
          end_date: dtend,
          rrule: recurrence.recurrenceType,
          isWeekdayDependent: recurrence.byDayOccurence && recurrence.byDayWeekday,
          entire_day: entireDay,
          icon
      };
      if (recurrence.byDayOccurence) obj.byDayOccurence = recurrence.byDayOccurence;
      if (recurrence.byDayWeekday) obj.byDayWeekday = recurrence.byDayWeekday;
      return Object.assign(new VCalendarEvent(), obj);
  }

  static extractValue = (vcalString: string | undefined | null, key: string): string | null  => {
      if (!vcalString) return null;
    // Escape regex special characters for safe pattern matching
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // nosemgrep: eslint.detect-non-literal-regexp - key is escaped before use
    return vcalString.match(new RegExp(escapedKey + '(?:;[^:]+)?:([^\n\r]+)'))?.[1]?.trim() ?? null;
  }

  static extractDate = (vcalString: string, key: string): { date: Date, entireDay: boolean } | null => this.parseDateString(this.extractValue(vcalString, key) || '');

  static parseDateString(dateString: string): { date: Date, entireDay: boolean } | null {
      const dateFormat1 = /^\d{8}$/; // Format: YYYYMMDD
      const dateFormat2 = /^\d{8}T\d{6}Z$/; // Format: YYYYMMDDTHHmmssZ
      const dateFormat3 = /^\d{8}T\d{6}$/; // Format: YYYYMMDDTHHmmss

      if (dateFormat1.test(dateString)) {
          const year = parseInt(dateString.substring(0, 4), 10);
          const month = parseInt(dateString.substring(4, 6), 10) - 1;
          const day = parseInt(dateString.substring(6, 8), 10);
          const date = new Date(year, month, day);
          return { date: date, entireDay: true };
      } else if (dateFormat2.test(dateString)) {
          const date = new Date(Date.UTC(
              parseInt(dateString.substring(0, 4), 10),
              parseInt(dateString.substring(4, 6), 10) - 1,
              parseInt(dateString.substring(6, 8), 10),
              parseInt(dateString.substring(9, 11), 10),
              parseInt(dateString.substring(11, 13), 10),
              parseInt(dateString.substring(13, 15), 10)
          ));
          return { date: date, entireDay: false };
      } else if (dateFormat3.test(dateString)) {
          const date = new Date(
              parseInt(dateString.substring(0, 4), 10),
              parseInt(dateString.substring(4, 6), 10) - 1,
              parseInt(dateString.substring(6, 8), 10),
              parseInt(dateString.substring(9, 11), 10),
              parseInt(dateString.substring(11, 13), 10),
              parseInt(dateString.substring(13, 15), 10)
          );
          return { date: date, entireDay: false };
      } else {
          return null;
      }
  }

  static parseRRule(rrule: string|null): { recurrenceType: RecurrenceType, byDayWeekday?: string, byDayOccurence?: string } {
    const recurrenceType = Object.values(RecurrenceType).find(type => rrule?.includes(type)) ?? RecurrenceType.None;
    const match = rrule?.match(/BYDAY=([1-4,-]*[A-Z,]*)/)?.[1]?.match(/([1-4,-]*)([A-Z]+)/);
    return { recurrenceType, byDayOccurence: match?.[1], byDayWeekday: match?.[2] ?? match?.[0] };
  }
  static isSameDay(date1: Date, date2: Date): boolean {
    return date1.toDateString() === date2.toDateString();
  }
}
