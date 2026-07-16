import { NgTemplateOutlet, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
    imports: [NgTemplateOutlet, DatePipe, FormsModule, Nx, AvatarComponent, AutosaveDirective, ProgressBarComponent, NgbTooltipModule, MoneyPipe],
})
export class MarketingRemarketingComponent {
    service = inject(MarketingService);

    due = signal<Company[]>([]);
    observed = signal<Company[]>([]);
    suggested = signal<Company[]>([]);

    constructor() {
        this.reload();
    }
    reload() {
        this.service.getRemarketing().subscribe((result) => {
            const due = Array.isArray(result?.due) ? result.due : [];
            const observed = Array.isArray(result?.observed) ? result.observed : [];
            const suggested = Array.isArray(result?.suggested) ? result.suggested : [];

            this.due.set(due.map((_) => Company.fromJson(_)));
            this.observed.set(observed.map((_) => Company.fromJson(_)).sort((a: Company, b: Company) => b.remarketingProgress() - a.remarketingProgress()));
            this.suggested.set(suggested.map((_) => Company.fromJson(_)).sort((a: Company, b: Company) => b.remarketingProgress() - a.remarketingProgress()));
        });
    }

    clearRemarketingInterval(item: Company) {
        item.update({ remarketing_interval: null }).subscribe();
    }
}
