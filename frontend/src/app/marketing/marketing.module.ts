import { NgModule } from "@angular/core";
import { RouterModule } from "@angular/router";
import { MarketingAssetsComponent } from "./marketing-assets/marketing-assets.component";
import { MarketingCampaignsComponent } from "./marketing-campaigns/marketing-campaigns.component";
import { MarketingDashboardComponent } from "./marketing-dashboard/marketing-dashboard.component";
import { MarketingEmailComponent } from "./marketing-email/marketing-email.component";
import { MarketingLeadSegmentationComponent } from "./marketing-lead-segmentation/marketing-lead-segmentation.component";
import { MarketingRemarketingComponent } from "./marketing-remarketing/marketing-remarketing.component";
import { MarketingSocialMediaComponent } from "./marketing-social-media/marketing-social-media.component";
import { MarketingComponent } from "./marketing.component";
import { MarketingWorkflowsComponent } from "./marketing-workflows/marketing-workflows.component";
import { MarketingWorkflowDetailComponent } from "./marketing-workflows/marketing-workflow-detail/marketing-workflow-detail.component";
import { MarketingProspectsComponent } from "./marketing-prospects/marketing-prospects.component";
import { MarketingProspectDetailComponent } from "./marketing-prospects/marketing-prospect-detail/marketing-prospect-detail.component";
import { MarketingMetricsComponent } from "./marketing-metrics/marketing-metrics.component";
import { MarketingInitiativesComponent } from "./marketing-initiatives/marketing-initiatives.component";
import { MarketingInitiativeDetailComponent } from "./marketing-initiatives/marketing-initiative-detail/marketing-initiative-detail.component";

@NgModule({
    imports: [
        RouterModule.forChild([
            {
                path: '',
                component: MarketingComponent,
                children: [
                    { path: 'dashboard', component: MarketingDashboardComponent },
                    {
                        path: 'initiatives',
                        component: MarketingInitiativesComponent,
                        children: [
                            { path: ':id', component: MarketingInitiativeDetailComponent }
                        ]
                    },
                    { path: 'metrics', component: MarketingMetricsComponent },
                    {
                        path: 'prospects',
                        component: MarketingProspectsComponent,
                        children: [
                            { path: ':id', component: MarketingProspectDetailComponent }
                        ]
                    },
                    {
                        path: 'workflows',
                        component: MarketingWorkflowsComponent,
                        children: [
                            { path: ':id', component: MarketingWorkflowDetailComponent }
                        ]
                    },
                    { path: 'assets', component: MarketingAssetsComponent },
                    { path: 'assets/:category', component: MarketingAssetsComponent },
                    { path: 'campaigns', component: MarketingCampaignsComponent },
                    { path: 'email', component: MarketingEmailComponent },
                    { path: 'lead-segmentation', component: MarketingLeadSegmentationComponent },
                    { path: 'social-media', component: MarketingSocialMediaComponent },
                    { path: 'remarketing', component: MarketingRemarketingComponent },
                    { path: '**', redirectTo: 'dashboard' },
                ]
            }
        ]),
    ],
})

export class MarketingModule { }
