import { VacationState } from "src/enums/vacation.state";
import { Serializable } from "../serializable"
import { VacationGrant } from "./vacation-grant.model";
import { VacationService } from "./vacation.service";
import { getVacatisingleActionResolveds } from "./vacation.actions";
import moment from "moment";
import { NxGlobal } from "src/app/nx/nx.global";
import { User } from "../user/user.model";
import { AutoWrap } from "@constants/autowrap";

export class Vacation extends Serializable {

    static STATE_REQUESTED = 0;
    static STATE_APPROVED = 1;
    static STATE_DENIED = 2;
    static STATE_SICK = 3;
    static STATE_CANCELLED = 4;

    static SICK_ICON     = 'health_and_safety'
    static VACATION_ICON = 'beach_access'
    static SICK_CLASS    = 'text-teal'
    static VACATION_CLASS = 'text-cyan'

    static override API_PATH = (): string => 'vacations'
    override SERVICE = VacationService

    comment           : string
    log               : string
    amount            : number
    state             : VacationState
    vacation_grant_id : string
    started_at       ?: string
    ended_at         ?: string
    approved_at      ?: string
    approved_by_id   ?: string
    doubleClickAction: number = 0
    actions = getVacatisingleActionResolveds(this)

    @AutoWrap('VacationGrant') grant:VacationGrant
    @AutoWrap('User') user:User
    @AutoWrap('User') approved_by:User

    frontendUrl = (): string | undefined => this.state < Vacation.STATE_SICK ? `/vacation/${this.id}` : undefined
    hasVacationPermissions = () => NxGlobal.global.user!.hasRole('hr')
    approve     = () => NxGlobal.service.put(`vacations/${this.id}/approve`, { state: Vacation.STATE_APPROVED })
    acknowledge = () => NxGlobal.service.put(`vacations/${this.id}/acknowledge`, { })
    deny        = (reason?:any) => NxGlobal.service.put(`vacations/${this.id}/approve`, { state: Vacation.STATE_DENIED, reason: reason })
    cancel      = () => NxGlobal.service.put(`vacations/${this.id}/approve`, { state: Vacation.STATE_CANCELLED })

    time_started = (): moment.Moment => moment(this.started_at)
    time_ended = (): moment.Moment => moment(this.ended_at)
    time_approved = (): moment.Moment => moment(this.approved_at)

    delta = () => this.state === Vacation.STATE_APPROVED ? this.amount : 0
    getStateIcon = (): string => {
        switch (this.state) {
            case Vacation.STATE_REQUESTED: return 'schedule'
            case Vacation.STATE_APPROVED: return 'check_circle'
            case Vacation.STATE_DENIED: return 'cancel'
            case Vacation.STATE_SICK: return 'healing'
            case Vacation.STATE_CANCELLED: return 'block'
            default: return 'help'
        }
    }

    getStateClass = (): string => {
        switch (this.state) {
            case Vacation.STATE_REQUESTED: return 'text-warning'
            case Vacation.STATE_APPROVED: return 'text-success'
            case Vacation.STATE_DENIED: return 'text-danger'
            case Vacation.STATE_SICK: return 'text-info'
            case Vacation.STATE_CANCELLED: return 'text-muted'
            default: return 'text-muted'
        }
    }

    getStateTooltip = (): string => {
        switch (this.state) {
            case Vacation.STATE_REQUESTED: return $localize`:@@i18n.vacation.state.pending:pending`
            case Vacation.STATE_APPROVED: return $localize`:@@i18n.common.approved:approved`
            case Vacation.STATE_DENIED: return $localize`:@@i18n.common.denied:denied`
            case Vacation.STATE_SICK: return $localize`:@@i18n.vacation.state.sick:sick leave`
            case Vacation.STATE_CANCELLED: return $localize`:@@i18n.vacation.state.cancelled:cancelled`
            default: return $localize`:@@i18n.common.unknown:unknown`
        }
    }

    // Type icon — represents the kind of absence (sick vs vacation), independent of approval state
    isSick      = () => this.state === Vacation.STATE_SICK
    isVacation  = () => this.state !== Vacation.STATE_SICK

    getTypeIcon    = (): string => this.isSick() ? Vacation.SICK_ICON : Vacation.VACATION_ICON
    getTypeClass   = (): string => this.isSick() ? Vacation.SICK_CLASS : Vacation.VACATION_CLASS
    getTypeTooltip = (): string => this.isSick()
        ? $localize`:@@i18n.vacation.state.sick:sick leave`
        : $localize`:@@i18n.vacation.type.vacation:vacation`

}