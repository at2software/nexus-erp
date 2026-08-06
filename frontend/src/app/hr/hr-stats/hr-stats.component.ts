import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { GlobalService } from '@models/global.service';
import { User } from '@models/user/user.model';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import { Nx } from '@app/nx/nx.directive';
import { Color } from '@constants/Color';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    selector: 'hr-stats',
    imports: [RouterModule, AvatarComponent, Nx],
    templateUrl: './hr-stats.component.html',
    styleUrl: './hr-stats.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HrStatsComponent {
    #global = inject(GlobalService);
    #router = inject(Router);

    team = signal<User[]>([]);

    readonly statsItems = [
        { title: $localize`:@@i18n.hr.focusCategories:Focus Categories`, description: $localize`:@@i18n.hr.focusCategoriesDesc:Analyze time allocation across different work categories`, route: 'focus-categories', icon: 'category' },
        { title: $localize`:@@i18n.hr.workload:Workload`, description: $localize`:@@i18n.hr.workloadDesc:Track team workload and productivity metrics`, route: 'workload', icon: 'assessment' },
        { title: $localize`:@@i18n.hr.predictionAccuracy:Prediction Accuracy`, description: $localize`:@@i18n.hr.predictionAccuracyDesc:Compare predicted vs actual effort for completed projects`, route: 'prediction-accuracy', icon: 'target' },
        { title: $localize`:@@i18n.hr.invoiceFocus:Invoice Focus`, description: $localize`:@@i18n.hr.invoiceFocusDesc:Analyze percentage of time spent on foci with invoice items`, route: 'invoice-focus', icon: 'visibility' },
    ];

    constructor() {
        this.#global.init.pipe(takeUntilDestroyed()).subscribe(() => this.team.set(this.#global.team));
    }

    navigateToStats = (route: string) => this.#router.navigate(['/hr/stats', route]);

    getHpwBadgeColor(hpw: number): string {
        if (!hpw) return new Color('#6c757d').toHexString();
        if (hpw >= 38) return new Color('#198754').toHexString();
        if (hpw >= 20) return new Color('#fd7e14').toHexString();
        return new Color('#dc3545').toHexString();
    }
}
