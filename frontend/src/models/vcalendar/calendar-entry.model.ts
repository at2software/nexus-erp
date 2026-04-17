import { Serializable } from "@models/serializable";
import { VCalendarEvent } from "./vcalendar-event.model";
import { VCalendarService } from "./vcalendar.service";
import { map, Observable } from "rxjs";
import { NxGlobal } from "@app/nx/nx.global";
import { NxAction } from "@app/nx/nx.actions";

export class CalendarEntry extends Serializable {

    static API_PATH = (): string => 'calendar_entries'
    SERVICE = VCalendarService

    vcalendar: string;
    is_editable: boolean = true;

    vcalendar_event: VCalendarEvent = new VCalendarEvent();

    actions: NxAction[] = [
        NxGlobal.deleteAction(this, 'Do you really want to delete this calendar item?', { on: () => this.is_editable })
    ];

    save(): Observable<CalendarEntry> {
        if (this.id) {
            return this.update({ vcalendar: this.vcalendar }).pipe(
                map(response => {
                    this.vcalendar_event = VCalendarEvent.extractEventData(response.vcalendar);
                    return this;
                })
            );
        } else {
            return this.store().pipe(
                map(response => {
                    Object.assign(this, response);
                    this.vcalendar_event = VCalendarEvent.extractEventData(response.vcalendar);
                    return this;
                })
            );
        }
    }
}
