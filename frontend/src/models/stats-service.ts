import { Injectable } from "@angular/core"
import { NexusHttpService } from "./http/http.nexus"
import { User } from "./user/user.model"

@Injectable({ providedIn: 'root' })
export class StatsService extends NexusHttpService<any> {
    apiPath = 'stats'
    TYPE = () => Object
    projectSuccessProbabilityCurve = () => this.get('stats/project-success-probability-curve')
    projectSuccessProbabilityCurveOver = (duration:number) => this.get(`stats/project-success-probability-curve/${duration}`)
    projectSuccessProbabilityCurveValue = () => this.get('stats/project-success-probability-curve-value')
    projectSuccessProbabilityCurveValueOver = (duration:number) => this.get(`stats/project-success-probability-curve-value/${duration}`)
    showMyWorkingTime = () => this.get('stats/my-working-time')
    showRevenueCurrentYear = () => this.get('stats/revenue-current-year')
    showSvB = () => this.get('stats/service-vs-budget')
    showTeamStatus = () => this.aget('stats/team-status', {}, User)
    showQuoteAccuracy = (period: { startDate: string, endDate: string }) => this.aget('stats/quote-accuracy', period)
    showInvoiceOverall = () => this.get('stats/invoice-overall')
    showFocusCategories = () => this.get('stats/focus-categories')
    showPredictionAccuracy = () => this.get('stats/prediction-accuracy')
    showFocusAccuracy = () => this.get('stats/focus-accuracy')
}
