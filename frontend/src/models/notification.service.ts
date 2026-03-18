import { Subject } from "rxjs";
import { TReturn } from "src/constants/t.return";

export interface NotificationType {key:string, value:any}
export class NotificationCenter {
    static subj:Subject<NotificationType> = new Subject<NotificationType>()
    static subscribe = (keys:string[] = [], regex_values:RegExp[] = [], success:TReturn) => {
        return NotificationCenter.subj.subscribe(_ => {
            _.key = _.key.replace(/^_*/, '')
            if (NotificationCenter.applies(_, keys, regex_values)) {
                success(_)
            }
        })
    }
    static applies = (notification: NotificationType, keys:string[] = [], regex_values:RegExp[] = []):boolean => {
        if (keys.indexOf(notification.key) === -1) return false
        for (const v of regex_values) {
            if ((notification.value as string).match(v)) {
                return true
            }
        }
        return false
    }
}