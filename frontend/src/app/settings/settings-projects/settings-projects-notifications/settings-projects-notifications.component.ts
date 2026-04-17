import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputSettingsGroupComponent } from '@shards/input-group/input-group.component';
import { BaseHttpService } from 'src/models/http.service';

@Component({
    selector: 'settings-projects-notifications',
    templateUrl: './settings-projects-notifications.component.html',
    styleUrls: ['./settings-projects-notifications.component.scss'],
    standalone: true,
    imports: [InputSettingsGroupComponent, FormsModule]
})
export class SettingsProjectsNotificationsComponent implements OnInit {

    #http = inject(BaseHttpService)

    thresholds: number[] = []
    newThreshold: number | null = null

    ngOnInit() {
        this.#http.get('params/PROJECT_WORK_THRESHOLDS').subscribe((param: any) => {
            if (param?.value) {
                try { this.thresholds = JSON.parse(param.value) } catch { this.thresholds = [] }
            }
        })
    }

    addThreshold() {
        const val = Number(this.newThreshold)
        if (!val || val <= 0 || this.thresholds.includes(val)) return
        this.thresholds = [...this.thresholds, val].sort((a, b) => a - b)
        this.newThreshold = null
        this.#save()
    }

    removeThreshold(threshold: number) {
        this.thresholds = this.thresholds.filter(t => t !== threshold)
        this.#save()
    }

    #save() {
        this.#http.put('params/PROJECT_WORK_THRESHOLDS', { value: JSON.stringify(this.thresholds) }).subscribe()
    }
}
