import { NgTemplateOutlet, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Nx } from '@app/nx/nx.directive';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import { AutosaveDirective } from '@directives/autosave.directive';
import { Company } from '@models/company/company.model';
import { MarketingService } from '@models/marketing/marketing.service';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { ProgressBarComponent } from '@shards/progress-bar/progress-bar.component';
import { MoneyPipe } from '@pipes/money.pipe';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'marketing-remarketing',
    templateUrl: './marketing-remarketing.component.html',
    styleUrls: ['./marketing-remarketing.component.scss'],
    standalone: true,
    imports: [NgTemplateOutlet, DatePipe, FormsModule, Nx, AvatarComponent, AutosaveDirective, ProgressBarComponent, NgbTooltipModule, MoneyPipe],
})
export class MarketingRemarketingComponent implements OnInit {
    service = inject(MarketingService);

    due = signal<Company[]>([]);
    observed = signal<Company[]>([]);
    suggested = signal<Company[]>([]);

    get observedList() {
        return this.observed();
    }
    get suggestedList() {
        return this.suggested();
    }

    ngOnInit() {
        this.reload();
    }
    reload() {
        this.service.getRemarketing().subscribe((result: any) => {
            const due = Array.isArray(result?.due) ? result.due : [];
            const observed = Array.isArray(result?.observed) ? result.observed : [];
            const suggested = Array.isArray(result?.suggested) ? result.suggested : [];

            this.due.set(due.map(this.#toCompany));
            this.observed.set(observed.map(this.#toCompany).sort((a: Company, b: Company) => b.remarketingProgress() - a.remarketingProgress()));
            this.suggested.set(suggested.map(this.#toCompany).sort((a: Company, b: Company) => b.remarketingProgress() - a.remarketingProgress()));
        });
    }

    clearRemarketingInterval(item: Company) {
        item.update({ remarketing_interval: null }).subscribe();
    }

    #toCompany = (_: any): Company => {
        const m = Company.fromJson(_);
        m.var.revenue_12 = _.revenue_12;
        m.var.remarketing_due_at = _.remarketing_due_at;
        return m;
    };
}
