import { Serializable } from '@models/_core/serializable';
import { VCalendarEvent } from './vcalendar-event.model';
import { map, Observable } from 'rxjs';
import { nx } from '@models/_core/nx-bridge';
import { NxAction } from '@models/_core/nx.actions';
import { Model } from '@constants/model/type-discriminators';

@Model('CalendarEntry')
export class CalendarEntry extends Serializable {
    static API_PATH = (): string => 'calendar_entries';

    vcalendar: string = '';
    is_editable: boolean = true;

    vcalendar_event: VCalendarEvent = new VCalendarEvent();

    protected override buildActions(): NxAction[] { return [nx().deleteAction(this, 'Do you really want to delete this calendar item?', { on: () => this.is_editable })] }

    save(): Observable<CalendarEntry> {
        if (this.id) {
            return this.update({ vcalendar: this.vcalendar }).pipe(
                map((response) => {
                    this.vcalendar_event = VCalendarEvent.extractEventData(response.vcalendar);
                    return this;
                }),
            );
        } else {
            return this.store().pipe(
                map((response) => {
                    Object.assign(this, response);
                    this.vcalendar_event = VCalendarEvent.extractEventData(response.vcalendar);
                    return this;
                }),
            );
        }
    }
}
