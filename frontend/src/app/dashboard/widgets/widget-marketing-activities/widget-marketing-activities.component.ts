import { Component, inject, OnInit } from '@angular/core';
import { MarketingService } from '@models/marketing/marketing.service';
import { BaseWidgetComponent } from '../base.widget.component';
import { MarketingProspectActivity } from '@models/marketing/marketing-prospect-activity.model';
import { CommonModule, DatePipe } from '@angular/common';
import { NexusModule } from '@app/nx/nexus.module';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { SmartLinkDirective } from '@directives/smart-link.directive';

@Component({
    selector: 'widget-marketing-activities',
    imports: [DatePipe, CommonModule, NexusModule, NgbTooltipModule, SmartLinkDirective],
    templateUrl: './widget-marketing-activities.component.html',
    styleUrl: './widget-marketing-activities.component.scss',
})
export class WidgetMarketingActivitiesComponent extends BaseWidgetComponent implements OnInit {
    activities: MarketingProspectActivity[] = []
    
    #service = inject(MarketingService)

    reload() {
        this.#service.indexProspectActivitiesForAddon({}).subscribe(data => this.activities = data)
    }
}
