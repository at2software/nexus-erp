import { Component, inject } from '@angular/core';
import { NgbActiveModal, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { ModalBaseComponent } from '@app/_modals/modal-base.component';
import { Sentinel } from '@models/sentinel.model';
import { SENTINEL_CONDITIONS, SentinelCondition } from '../../sentinel-condition.model';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ColumnRelationAutocompleteComponent } from './column-relation-autocomplete/column-relation-autocomplete.component';
import { VariableAutocompleteComponent } from '../profile-sentinel-command-modal/variable-autocomplete/variable-autocomplete.component';

@Component({
    selector: 'sentinel-condition-edit-modal', templateUrl: './profile-sentinel-condition-modal.component.html', styleUrls: ['./profile-sentinel-condition-modal.component.scss'],
    standalone: true,
    imports: [ColumnRelationAutocompleteComponent, VariableAutocompleteComponent, FormsModule, CommonModule, NgbDropdownModule]
})
export class ProfileSentinelConditionModalComponent extends ModalBaseComponent<boolean> {
    sentinel: Sentinel
    column = 0;
    row = 0;
    nested = false;
    onSave?: (condition: any) => void;
    variableContext?: { name: string, table: string };
    #activeModal = inject(NgbActiveModal)

    allConditions = SENTINEL_CONDITIONS;
    selectedCondition: SentinelCondition;

    init(sentinel: Sentinel, index: { column?: number, row?: number, nested?: boolean, nestedData?: any, onSave?: (c: any) => void, variableContext?: { name: string, table: string } }): void {
        this.sentinel = sentinel
        this.column = index.column ?? 0;
        this.row = index.row ?? 0;
        this.nested = index.nested ?? false;
        this.onSave = index.onSave;
        this.variableContext = index.variableContext;
        this.allConditions = SENTINEL_CONDITIONS.filter(c => c.allowedTriggerTypes.includes(this.sentinel.trigger))

        if (this.nested && index.nestedData) {
            this.selectedCondition = this.parseCondition(index.nestedData);
        } else if (this.sentinel.condition) {
            const conditions = JSON.parse(this.sentinel.condition);
            if (conditions[this.column]?.[this.row]) {
                this.selectedCondition = this.parseCondition(conditions[this.column][this.row]);
            }
        }
    }

    onSuccess = () => true

    accept = () => {
        const condition = {
            key: this.selectedCondition.key,
            inverted: this.selectedCondition.inverted ?? false,
            options: this.selectedCondition.options?.map(o => ({ key: o.key, value: o.value })) || []
        };

        if (this.nested && this.onSave) {
            this.onSave(condition);
            this.#activeModal.close(true);
            return;
        }

        const conditions = JSON.parse(this.sentinel.condition || '[]');
        if (conditions[this.column]?.[this.row]) {
            conditions[this.column][this.row] = condition;
            this.sentinel.condition = JSON.stringify(conditions);
        }

        this.sentinel?.update({ condition: this.sentinel.condition }).subscribe(_ => this.sentinel = _)
        this.#activeModal.close(true)
    };

    decline = () => this.#activeModal.close(undefined);
    dismiss = () => this.#activeModal.close(undefined);

    parseCondition(data: any) {
        const index = this.allConditions.findIndex(c => c.key == data.key);
        if (index == -1) return new SentinelCondition();

        if (this.allConditions[index].options && data?.options?.length > 0) {
            this.allConditions[index].options.forEach(opt => {
                const match = data.options.find((o: any) => o.key == opt.key);
                if (match) opt.value = match.value;
            });
        }
        this.allConditions[index].inverted = data.inverted;
        return this.allConditions[index];
    }
}
