import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { Sentinel } from '@models/sentinel.model';
import { SentinelService } from '@models/sentinel.service';
import { GlobalService } from '@models/global.service';
import { ModalBaseService } from '@app/_modals/modal-base-service';
import { ProfileSentinelTriggerModalComponent } from '../profile-sentinel-node/profile-sentinel-trigger-modal/profile-sentinel-trigger-modal.component';
import { ProfileSentinelCommandModalComponent } from '../profile-sentinel-node/profile-sentinel-command-modal/profile-sentinel-command-modal.component';
import { ProfileSentinelConditionModalComponent } from '../profile-sentinel-node/profile-sentinel-condition-modal/profile-sentinel-condition-modal.component';
import { ObserverTrigger } from 'src/enums/observer-trigger';
import { SENTINEL_CONDITIONS } from '../sentinel-condition.model';
import { SENTINEL_COMMANDS } from '../sentinel-command.model';
import { PermissionsDirective } from '@directives/permissions.directive';
import { AutosaveDirective } from '@directives/autosave.directive';

@Component({
    selector: 'profile-sentinel-detail',
    templateUrl: './profile-sentinel-detail.component.html',
    styleUrl: './profile-sentinel-detail.component.scss',
    standalone: true,
    imports: [FormsModule, PermissionsDirective, AutosaveDirective]
})
export class ProfileSentinelDetailComponent implements OnInit {
    sentinel?: Sentinel;
    conditions: any[][] = [];
    commands: any[] = [];
    allSentinels: Sentinel[] = [];
    circularWarning: string | null = null;

    #modal = inject(ModalBaseService);
    #route = inject(ActivatedRoute);
    #sentinelService = inject(SentinelService);
    #global = inject(GlobalService);

    ngOnInit() {
        this.#sentinelService.index().subscribe(sentinels => {
            this.allSentinels = sentinels.map((s: any) => Sentinel.fromJson(s));
        });

        this.#route.params.subscribe(params => {
            if (params['id']) {
                this.#sentinelService.show(params['id']).subscribe(_ => {
                    this.sentinel = Sentinel.fromJson(_);
                    this.parseConditions();
                    this.parseCommands();
                    this.checkCircularReferences();
                });
            }
        });
    }

    checkCircularReferences() {
        if (!this.sentinel) return;
        this.circularWarning = null;

        const myTriggerTable = this.sentinel.table_name;
        const myTargetTables = this.#getActionTargetTables(this.commands);

        for (const other of this.allSentinels) {
            if (other.id === this.sentinel.id) continue;

            const otherTriggerTable = other.table_name;
            const otherCommands = this.#parseCommandsFromJson(other.result);
            const otherTargetTables = this.#getActionTargetTables(otherCommands);

            // Other creates what triggers this sentinel
            if (otherTargetTables.includes(myTriggerTable)) {
                this.circularWarning = `"${other.name}" creates "${myTriggerTable}" which triggers this sentinel.`;
                return;
            }

            // This creates what triggers other sentinel
            if (myTargetTables.includes(otherTriggerTable)) {
                this.circularWarning = `This sentinel creates "${otherTriggerTable}" which triggers "${other.name}".`;
                return;
            }
        }
    }

    #getActionTargetTables(commands: any[]): string[] {
        const tables: string[] = [];
        for (const cmd of commands) {
            if (cmd.key === 'create_new') {
                const table = cmd.options?.find((o: any) => o.key === 'table')?.value;
                if (table) tables.push(table);
            } else if (cmd.key === 'for_each' && cmd.actions) {
                tables.push(...this.#getActionTargetTables(cmd.actions));
            }
        }
        return tables;
    }

    #parseCommandsFromJson(json: string): any[] {
        try { return JSON.parse(json || '[]'); }
        catch { return []; }
    }

    parseConditions() {
        try { this.conditions = JSON.parse(this.sentinel?.condition || '[]'); }
        catch { this.conditions = []; }
    }

    parseCommands() {
        try { this.commands = JSON.parse(this.sentinel?.result || '[]'); }
        catch { this.commands = []; }
    }

    getTriggerLabel = () => ObserverTrigger[this.sentinel?.trigger ?? 0] || 'Unknown';

    getTriggerColor(): string {
        switch (this.sentinel?.trigger) {
            case ObserverTrigger.OnCreated: return 'success';
            case ObserverTrigger.OnUpdated: return 'teal';
            case ObserverTrigger.OnDeleted: return 'danger';
            case ObserverTrigger.OnSchedule: return 'cyan';
            default: return 'dark-grey';
        }
    }

    getConditionLabel = (c: any) => SENTINEL_CONDITIONS.find(x => x.key === c.key)?.label || c.key || 'Unknown';
    getConditionColumn = (c: any) => c.options?.find((o: any) => o.key === 'column')?.value || '';
    getConditionInput = (c: any) => c.options?.find((o: any) => o.key === 'input')?.value || '';
    getCommandLabel = (c: any) => SENTINEL_COMMANDS.find(x => x.key === c.key)?.label || c.key || 'Unknown';

    // Colorize {{variables}} in strings - returns HTML
    colorizeVariables(text: string): string {
        if (!text) return '';
        // Escape HTML first, then colorize variables
        const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return escaped.replace(/\{\{([^}]+)\}\}/g, '<span class="var-highlight">{{$1}}</span>');
    }

    getCommandTarget(cmd: any): string {
        if (['create_new', 'create_for_each'].includes(cmd.key)) {
            return cmd.options?.find((o: any) => o.key === 'table')?.value || '';
        }
        if (cmd.key === 'mattermost_post') {
            return cmd.options?.find((o: any) => o.key === 'channel_id')?.value || '';
        }
        return '';
    }

    getCommandDetails(cmd: any): { key: string; value: string }[] {
        if (cmd.key === 'create_new') {
            const fieldsJson = cmd.options?.find((o: any) => o.key === 'fields')?.value || '{}';
            try {
                const fields = JSON.parse(fieldsJson);
                return Object.entries(fields).map(([k, v]) => ({ key: k, value: String(v) }));
            } catch { return []; }
        }
        if (cmd.key === 'mattermost_post') {
            const message = cmd.options?.find((o: any) => o.key === 'message')?.value || '';
            return message ? [{ key: 'message', value: message }] : [];
        }
        if (cmd.key === 'set_value') {
            const column = cmd.options?.find((o: any) => o.key === 'column')?.value || '';
            const value = cmd.options?.find((o: any) => o.key === 'input')?.value || '';
            return column ? [{ key: column, value: value }] : [];
        }
        return [];
    }

    // For Each helpers
    getForEachRelation = (cmd: any) => cmd.options?.find((o: any) => o.key === 'relation')?.value || '';
    getForEachVariable = (cmd: any) => cmd.options?.find((o: any) => o.key === 'variable')?.value || 'item';

    getNestedConditionsFlat(cmd: any): { groupIndex: number; index: number; column: string; label: string; input: string }[] {
        const result: any[] = [];
        (cmd.conditions || []).forEach((group: any[], groupIndex: number) => {
            group.forEach((cond: any, index: number) => {
                result.push({
                    groupIndex,
                    index,
                    column: cond.options?.find((o: any) => o.key === 'column')?.value || '',
                    label: SENTINEL_CONDITIONS.find(x => x.key === cond.key)?.label || cond.key || 'Unknown',
                    input: cond.options?.find((o: any) => o.key === 'input')?.value || ''
                });
            });
        });
        return result;
    }

    addForEachCondition(cmdIndex: number) {
        if (!this.commands[cmdIndex].conditions) this.commands[cmdIndex].conditions = [];
        this.commands[cmdIndex].conditions.push([{ key: 'none' }]);
        this.#updateCommands();
    }

    addForEachAction(cmdIndex: number) {
        if (!this.commands[cmdIndex].actions) this.commands[cmdIndex].actions = [];
        this.commands[cmdIndex].actions.push({ key: 'none' });
        this.#updateCommands();
    }

    editForEachCondition(cmdIndex: number, groupIndex: number, condIndex: number) {
        const cmd = this.commands[cmdIndex];
        const condition = cmd.conditions?.[groupIndex]?.[condIndex];
        if (!condition) return;

        // Get variable context from the for_each command
        const variableName = cmd.options?.find((o: any) => o.key === 'variable')?.value || 'item';
        const relationName = cmd.options?.find((o: any) => o.key === 'relation')?.value || '';
        const variableTable = this.#getRelationTable(relationName);

        this.#modal.open(ProfileSentinelConditionModalComponent, this.sentinel, {
            nested: true,
            nestedData: condition,
            variableContext: variableTable ? { name: variableName, table: variableTable } : undefined,
            onSave: (updatedCondition: any) => {
                this.commands[cmdIndex].conditions[groupIndex][condIndex] = updatedCondition;
                this.#updateCommands();
            }
        }).then(() => this.#reload());
    }

    #getRelationTable(relationPath: string): string | undefined {
        if (!this.sentinel?.table_name || !relationPath) return undefined;
        const triggerVar = this.sentinel.trigger_variable || '';
        const path = triggerVar && relationPath.startsWith(triggerVar + '.') ? relationPath.substring(triggerVar.length + 1) : relationPath;
        let currentTable = this.sentinel.table_name;

        for (const part of path.split('.')) {
            const relation = this.#global.relations.find((r: any) => r.table === currentTable)?.relations?.[part];
            if (!relation?.model) return undefined;
            currentTable = relation.model.toLowerCase();
        }
        return currentTable;
    }

    editForEachAction(cmdIndex: number, actionIndex: number) {
        const cmd = this.commands[cmdIndex];
        const action = cmd.actions?.[actionIndex];
        if (!action) return;

        // Get loop variable context
        const loopVariable = cmd.options?.find((o: any) => o.key === 'variable')?.value || 'item';
        const relationPath = cmd.options?.find((o: any) => o.key === 'relation')?.value || '';
        const loopTable = this.#getRelationTable(relationPath);

        this.#modal.open(ProfileSentinelCommandModalComponent, this.sentinel, {
            nested: true,
            nestedData: action,
            loopVariable,
            loopTable,
            onSave: (updatedAction: any) => {
                this.commands[cmdIndex].actions[actionIndex] = updatedAction;
                this.#updateCommands();
            }
        }).then(() => this.#reload());
    }

    deleteForEachCondition(cmdIndex: number, groupIndex: number, condIndex: number, event: Event) {
        event.stopPropagation();
        const cmd = this.commands[cmdIndex];
        if (!cmd.conditions?.[groupIndex]) return;

        cmd.conditions[groupIndex].splice(condIndex, 1);
        if (cmd.conditions[groupIndex].length === 0) {
            cmd.conditions.splice(groupIndex, 1);
        }
        this.#updateCommands();
    }

    deleteForEachAction(cmdIndex: number, actionIndex: number, event: Event) {
        event.stopPropagation();
        const cmd = this.commands[cmdIndex];
        if (!cmd.actions) return;

        cmd.actions.splice(actionIndex, 1);
        this.#updateCommands();
    }

    editTrigger = () => this.#modal.open(ProfileSentinelTriggerModalComponent, this.sentinel).then(() => this.#reload());

    editCondition(colIndex: number, rowIndex: number) {
        this.#modal.open(ProfileSentinelConditionModalComponent, this.sentinel, { column: colIndex, row: rowIndex }).then(() => this.#reload());
    }

    editCommand = (index: number) => this.#modal.open(ProfileSentinelCommandModalComponent, this.sentinel, index).then(() => this.#reload());

    addCondition() {
        if (!this.sentinel) return;
        this.conditions.push([{ key: 'none' }]);
        this.#updateConditions();
    }

    addConditionToGroup(colIndex: number) {
        if (!this.sentinel) return;
        this.conditions[colIndex].push({ key: 'none' });
        this.#updateConditions();
    }

    deleteCondition(colIndex: number, rowIndex: number) {
        if (!this.sentinel) return;
        this.conditions[colIndex].splice(rowIndex, 1);
        if (this.conditions[colIndex].length === 0) this.conditions.splice(colIndex, 1);
        this.#updateConditions();
    }

    addCommand() {
        if (!this.sentinel) return;
        this.commands.push({ key: 'none' });
        this.#updateCommands();
    }

    deleteCommand(index: number) {
        if (!this.sentinel) return;
        this.commands.splice(index, 1);
        this.#updateCommands();
    }

    #updateConditions() {
        this.sentinel!.condition = JSON.stringify(this.conditions);
        this.sentinel!.update({ condition: this.sentinel!.condition }).subscribe(_ => {
            this.sentinel = Sentinel.fromJson(_);
            this.parseConditions();
        });
    }

    #updateCommands() {
        this.sentinel!.result = JSON.stringify(this.commands);
        this.sentinel!.update({ result: this.sentinel!.result }).subscribe(_ => {
            this.sentinel = Sentinel.fromJson(_);
            this.parseCommands();
        });
    }

    #reload() {
        if (!this.sentinel) return;
        this.#sentinelService.show(String(this.sentinel.id)).subscribe(_ => {
            this.sentinel = Sentinel.fromJson(_);
            this.parseConditions();
            this.parseCommands();
            this.checkCircularReferences();
        });
    }
}
