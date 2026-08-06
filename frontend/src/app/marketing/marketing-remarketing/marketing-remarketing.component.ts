import { NgTemplateOutlet, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Nx } from '@app/nx/nx.directive';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import { AutosaveDirective } from '@directives/autosave.directive';
import { Company } from '@models/company/company.model';
import { MarketingService } from '@models/marketing/marketing.service';
import { modelResource } from '@models/http/model-resource';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { ProgressBarComponent } from '@shards/progress-bar/progress-bar.component';
import { MoneyPipe } from '@pipes/money.pipe';
import { REPEATING_RECURRENCES } from '@enums/recurrence.type';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'marketing-remarketing',
    templateUrl: './marketing-remarketing.component.html',
    styleUrls: ['./marketing-remarketing.component.scss'],
    imports: [NgTemplateOutlet, DatePipe, FormsModule, Nx, AvatarComponent, AutosaveDirective, ProgressBarComponent, NgbTooltipModule, MoneyPipe],
})
export class MarketingRemarketingComponent {
    service = inject(MarketingService);

    readonly recurrences = REPEATING_RECURRENCES;

    #remarketing = modelResource(() => this.service.getRemarketing());

    observed = computed(() => this.#byProgress(this.#remarketing.value()?.observed));
    suggested = computed(() => this.#byProgress(this.#remarketing.value()?.suggested));

    #byProgress = (companies?: Company[]) => [...(companies ?? [])].sort((a, b) => b.remarketingProgress() - a.remarketingProgress());

    clearRemarketingInterval(item: Company) {
        item.update({ remarketing_interval: null }).subscribe();
    }
}
