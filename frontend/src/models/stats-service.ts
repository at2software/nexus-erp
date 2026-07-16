import { Injectable } from '@angular/core';
import { NexusHttpService } from './http/http.nexus';
import { User } from './user/user.model';
import { CustomerRevenueScatterResponse, InvoiceOverallResponse, ProjectProductMixResponse, ProjectSuccessRateResponse, QuoteAcceptanceSignalCurveResponse, QuoteAccuracyPoint, RevenueCurrentYearResponse } from './api-response';

@Injectable({ providedIn: 'root' })
export class StatsService extends NexusHttpService<any> {
    apiPath = 'stats';

    quoteAcceptanceSignalCurve              = (signal: string) => this.get<QuoteAcceptanceSignalCurveResponse>(`stats/quote-acceptance-signal-curve/${signal}`);
    showMyWorkingTime                       = () => this.get('stats/my-working-time');
    showRevenueCurrentYear                  = () => this.get<RevenueCurrentYearResponse>('stats/revenue-current-year');
    showSvB                                 = () => this.get('stats/service-vs-budget');
    showTeamStatus                          = () => this.aget('stats/team-status', {}, User);
    showQuoteAccuracy                       = (period: { startDate: string; endDate: string }) => this.aget<QuoteAccuracyPoint>('stats/quote-accuracy', period);
    showProjectProductMix                   = (period: { startDate: string; endDate: string }) => this.get<ProjectProductMixResponse>('stats/project-product-mix', period);
    showProjectSuccessRate                  = (period: { startDate: string; endDate: string }) => this.get<ProjectSuccessRateResponse>('stats/project-success-rate', period);
    showInvoiceOverall                      = () => this.get<InvoiceOverallResponse>('stats/invoice-overall');
    showFocusCategories                     = () => this.get('stats/focus-categories');
    showPredictionAccuracy                  = () => this.get('stats/prediction-accuracy');
    showFocusAccuracy                       = () => this.get('stats/focus-accuracy');
    getCustomerRevenueScatter               = () => this.get<CustomerRevenueScatterResponse>('stats/customer-revenue-scatter');
}
