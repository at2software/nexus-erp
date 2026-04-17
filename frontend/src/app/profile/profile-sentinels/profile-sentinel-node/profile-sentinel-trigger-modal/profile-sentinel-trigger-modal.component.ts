import { Component, inject } from '@angular/core';
import { NgbActiveModal, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { ModalBaseComponent } from '@app/_modals/modal-base.component';
import { Sentinel } from '@models/sentinel.model';
import { ObserverTrigger } from 'src/enums/observer-trigger';
import { GlobalService } from '@models/global.service';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'sentinel-trigger-edit-modal', templateUrl: './profile-sentinel-trigger-modal.component.html', styleUrls: ['./profile-sentinel-trigger-modal.component.scss'],
    standalone: true,
    imports: [FormsModule, NgbDropdownModule]
})
export class ProfileSentinelTriggerModalComponent extends ModalBaseComponent<boolean> {
    sentinel: Sentinel
    referenceSentinel: Sentinel
    #activeModal = inject(NgbActiveModal)
    #global = inject(GlobalService)

    ObserverTrigger = ObserverTrigger
    triggerOptions: {label: string, value: number}[] = Object.keys(ObserverTrigger)
        .filter(key => !isNaN(Number(ObserverTrigger[key as any])))
        .map(key => ({ label: key, value: ObserverTrigger[key as keyof typeof ObserverTrigger] as number }))
        .filter(opt => ![ObserverTrigger.Always, ObserverTrigger.Once].includes(opt.value));
    tables: { name: string, columns: string[] }[] = []
    allowedTimes = ['00:00', '08:00', '12:00', '17:00']

    init(sentinel: Sentinel): void {
        this.referenceSentinel = sentinel
        this.sentinel = Object.assign(Sentinel.fromJson(), sentinel)
        this.tables = this.#global.tables.filter(table => this.#hasReadAccess(table.name))
    }

    #hasReadAccess(tableName: string): boolean {
        if (this.#isExcludedTable(tableName)) return false;
        if (this.#isPivotTable(tableName)) return true;
        // Admin has access to all tables
        return this.#global.user?.hasRole('admin') ?? false
    }

    #isPivotTable(tableName: string): boolean {
        const pivotPatterns = ['project_project_state', 'company_contact', 'user_role'];
        if (pivotPatterns.includes(tableName)) return true;
        const parts = tableName.split('_');
        return parts.length >= 2 && this.tables.some(t => t.name === parts[0] + 's' || t.name === parts[0]);
    }

    #isExcludedTable(tableName: string): boolean {
        const excluded = [
            'assignment_roles', 'encryptions', 'password_reset_tokens', 'personal_access_tokens',
            'telescope_entries', 'telescope_entries_tags', 'telescope_monitoring',
            'user_employments', 'user_paid_times', 'vaults', 'websockets_statistics_entries'
        ];
        return excluded.includes(tableName);
    }

    onSuccess = () => true

    onTriggerTypeChange() {
        if (this.triggerIsModelBased()) this.selectTable(this.tables[0]?.name);
        else if (this.triggerIsTimeBased()) this.sentinel.table_name = '00:00';
    }

    selectTable(tableName: string) {
        this.sentinel.table_name = tableName;
        // Auto-generate variable name from table (e.g., project_project_state -> pps)
        if (!this.sentinel.trigger_variable || this.sentinel.trigger_variable === this.#generateVarName(this.sentinel.table_name)) {
            this.sentinel.trigger_variable = this.#generateVarName(tableName);
        }
    }

    #generateVarName(tableName: string): string {
        if (!tableName) return '';
        // Create abbreviation from underscored parts (project_project_state -> pps)
        return tableName.split('_').map(p => p[0]).join('');
    }

    triggerIsModelBased = () => [ObserverTrigger.OnCreated, ObserverTrigger.OnUpdated, ObserverTrigger.OnDeleted].includes(this.sentinel.trigger);
    triggerIsTimeBased = () => this.sentinel.trigger == ObserverTrigger.OnSchedule;

    getTriggerColor(trigger: number): string {
        switch (trigger) {
            case ObserverTrigger.OnCreated: return 'success';
            case ObserverTrigger.OnUpdated: return 'teal';
            case ObserverTrigger.OnDeleted: return 'danger';
            case ObserverTrigger.OnSchedule: return 'cyan';
            default: return 'dark-grey';
        }
    }

    accept = () => {
        this.referenceSentinel?.update({
            trigger: this.sentinel.trigger,
            table_name: this.sentinel.table_name,
            trigger_variable: this.sentinel.trigger_variable
        }).subscribe(_ => this.referenceSentinel = _)
        this.#activeModal.close(this.sentinel)
    };
    decline = () => this.#activeModal.close(undefined);
    dismiss = () => this.#activeModal.close(undefined);
}
