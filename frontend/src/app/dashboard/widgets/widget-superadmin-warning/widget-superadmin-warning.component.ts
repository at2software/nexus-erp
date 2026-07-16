import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { User } from '@models/user/user.model';
import { GlobalService } from '@models/global.service';
import { SpinnerComponent } from '@shards/spinner/spinner.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'widget-superadmin-warning',
    templateUrl: './widget-superadmin-warning.component.html',
    imports: [SpinnerComponent],
})
export class WidgetSuperadminWarningComponent {
    #global = inject(GlobalService);

    superadmin = signal<User | undefined>(undefined);
    loading = signal(false);

    constructor() {
        this.superadmin.set(this.#global.teamAll?.find((u) => u.getName() === 'Super Admin'));
    }

    retire() {
        if (!this.superadmin() || this.loading()) return;
        this.loading.set(true);
        this.superadmin()!.delete().subscribe({
            next: () => { this.superadmin.set(undefined); this.loading.set(false); },
            error: () => this.loading.set(false),
        });
    }
}
