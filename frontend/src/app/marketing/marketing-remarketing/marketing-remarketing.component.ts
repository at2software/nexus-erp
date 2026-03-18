import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NexusModule } from '@app/nx/nexus.module';
import { AutosaveDirective } from '@directives/autosave.directive';
import { Company } from '@models/company/company.model';
import { MarketingService } from '@models/marketing/marketing.service';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { ProgressBarComponent } from '@shards/progress-bar/progress-bar.component';
import { MoneyPipe } from 'src/pipes/money.pipe';

@Component({
    selector: 'marketing-remarketing',
    templateUrl: './marketing-remarketing.component.html',
    styleUrls: ['./marketing-remarketing.component.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, NexusModule, AutosaveDirective, ProgressBarComponent, NgbTooltipModule, MoneyPipe]
})
export class MarketingRemarketingComponent implements OnInit {
    
    service = inject(MarketingService)

    due:Company[]
    observed:Company[]
    suggested:Company[]

    ngOnInit() {
        this.reload()
    }
    reload() {
        this.service.getRemarketing().subscribe((result: any) => {
            this.due = result.due.map(this.#toCompany)
            this.observed = result.observed.map(this.#toCompany).sort((a:Company, b:Company) => b.remarketingProgress - a.remarketingProgress)
            this.suggested = result.suggested.map(this.#toCompany).sort((a:Company, b:Company) => b.remarketingProgress - a.remarketingProgress)
        })
    }
    #toCompany = (_:any):Company => {
        const m = Company.fromJson(_)
        m.var.revenue_12 = _.revenue_12
        m.var.remarketing_due_at = _.remarketing_due_at	
        return m
    }
}
