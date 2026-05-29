import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputSettingsGroupComponent } from '@shards/input-group/input-settings-group.component';
import { NexusHttpService } from '@models/http/http.nexus';

@Component({
    selector: 'settings-projects-notifications',
    templateUrl: './settings-projects-notifications.component.html',
    styleUrls: ['./settings-projects-notifications.component.scss'],
    standalone: true,
    imports: [InputSettingsGroupComponent, FormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsProjectsNotificationsComponent {
    thresholds = signal<number[]>([]);
    newThreshold = signal<number | null>(null);

    #http = inject(NexusHttpService);

    constructor() {
        this.#http.get('params/PROJECT_WORK_THRESHOLDS').subscribe((param: any) => {
            if (param?.value) {
                try {
                    this.thresholds.set(JSON.parse(param.value));
                } catch {
                    this.thresholds.set([]);
                }
            }
        });
    }

    addThreshold() {
        const val = Number(this.newThreshold());
        if (!val || val <= 0 || this.thresholds().includes(val)) return;
        this.thresholds.set([...this.thresholds(), val].sort((a, b) => a - b));
        this.newThreshold.set(null);
        this.#save();
    }

    removeThreshold(threshold: number) {
        this.thresholds.set(this.thresholds().filter((t) => t !== threshold));
        this.#save();
    }

    #save = () => this.#http.put('params/PROJECT_WORK_THRESHOLDS', { value: JSON.stringify(this.thresholds()) }).subscribe();
}
