import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { tracked } from '@constants/tracked';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { Sentinel } from '@models/sentinel.model';
import { SentinelService } from '@models/sentinel.service';
import { GlobalService } from '@models/global.service';
import { ModalBaseService } from '@app/_modals/modal-base-service';
import { ProfileSentinelTriggerModalComponent } from '../profile-sentinel-node/profile-sentinel-trigger-modal/profile-sentinel-trigger-modal.component';
import { ProfileSentinelCommandModalComponent } from '../profile-sentinel-node/profile-sentinel-command-modal/profile-sentinel-command-modal.component';
import { ProfileSentinelConditionModalComponent } from '../profile-sentinel-node/profile-sentinel-condition-modal/profile-sentinel-condition-modal.component';
import { ObserverTrigger } from '@enums/observer-trigger';
import { SENTINEL_CONDITIONS } from '../sentinel-condition.model';
import { SENTINEL_COMMANDS } from '../sentinel-command.model';
import { PermissionsDirective } from '@directives/permissions.directive';
import { AutosaveDirective } from '@directives/autosave.directive';

@Component({
    selector: 'profile-sentinel-detail',
    templateUrl: './profile-sentinel-detail.component.html',
    styleUrl: './profile-sentinel-detail.component.scss',
    standalone: true,
    imports: [FormsModule, PermissionsDirective, AutosaveDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileSentinelDetailComponent {
    #modal = inject(ModalBaseService);
    #route = inject(ActivatedRoute);
    #sentinelService = inject(SentinelService);
    #global = inject(GlobalService);

    protected readonly _sentinel = signal<Sentinel | undefined>(undefined);

    readonly sentinel = tracked(this._sentinel);
    conditions = signal<any[][]>([]);
    commands = signal<any[]>([]);
    circularWarning = signal<string | null>(null);

    #allSentinels: Sentinel[] = [];

    constructor() {
        this.#sentinelService.index().subscribe((sentinels) => {
            this.#allSentinels = sentinels.map((s: any) => Sentinel.fromJson(s));
        });

        this.#route.params.pipe(takeUntilDestroyed()).subscribe((params) => {
            if (params['id']) {
                this.#sentinelService.show(params['id']).subscribe((_) => {
                    this._sentinel.set(Sentinel.fromJson(_));
                    this.#parseConditions();
                    this.#parseCommands();
                    this.checkCircularReferences();
                });
            }
        });
    }

    checkCircularReferences() {
        const s = this.sentinel();
        if (!s) return;
        this.circularWarning.set(null);

        const myTriggerTable = s.table_name;
        const myTargetTables = this.#getActionTargetTables(this.commands());

        for (const other of this.#allSentinels) {
            if (other.id === s.id) continue;
            const otherTargetTables = this.#getActionTargetTables(this.#parseCommandsFromJson(other.result));

            if (otherTargetTables.includes(myTriggerTable)) {
                this.circularWarning.set(`"${other.name}" creates "${myTriggerTable}" which triggers this sentinel.`);
                return;
            }
            if (myTargetTables.includes(other.table_name)) {
                this.circularWarning.set(`This sentinel creates "${other.table_name}" which triggers "${other.name}".`);
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
        try { return JSON.parse(json || '[]'); } catch { return []; }
    }

    #parseConditions() {
        try { this.conditions.set(JSON.parse(this.sentinel()?.condition || '[]')); }
        catch { this.conditions.set([]); }
    }

    #parseCommands() {
        try { this.commands.set(JSON.parse(this.sentinel()?.result || '[]')); }
        catch { this.commands.set([]); }
    }

    getTriggerLabel = () => ObserverTrigger[this.sentinel()?.trigger ?? 0] || 'Unknown';

    getTriggerColor(): string {
        switch (this.sentinel()?.trigger) {
            case ObserverTrigger.OnCreated: return 'success';
            case ObserverTrigger.OnUpdated: return 'teal';
            case ObserverTrigger.OnDeleted: return 'danger';
            case ObserverTrigger.OnSchedule: return 'cyan';
            default: return 'dark-grey';
        }
    }

    getConditionLabel = (c: any) => SENTINEL_CONDITIONS.find((x) => x.key === c.key)?.label || c.key || 'Unknown';
    getConditionColumn = (c: any) => c.options?.find((o: any) => o.key === 'column')?.value || '';
    getConditionInput = (c: any) => c.options?.find((o: any) => o.key === 'input')?.value || '';
    getCommandLabel = (c: any) => SENTINEL_COMMANDS.find((x) => x.key === c.key)?.label || c.key || 'Unknown';

    colorizeVariables(text: string): string {
        if (!text) return '';
        const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return escaped.replace(/\{\{([^}]+)\}\}/g, '<span class="var-highlight">{{$1}}</span>');
    }

    getCommandTarget(cmd: any): string {
        if (['create_new', 'create_for_each'].includes(cmd.key)) return cmd.options?.find((o: any) => o.key === 'table')?.value || '';
        if (cmd.key === 'mattermost_post') return cmd.options?.find((o: any) => o.key === 'channel_id')?.value || '';
        return '';
    }

    getCommandDetails(cmd: any): { key: string; value: string }[] {
        if (cmd.key === 'create_new') {
            const fieldsJson = cmd.options?.find((o: any) => o.key === 'fields')?.value || '{}';
            try { return Object.entries(JSON.parse(fieldsJson)).map(([k, v]) => ({ key: k, value: String(v) })); }
            catch { return []; }
        }
        if (cmd.key === 'mattermost_post') {
            const message = cmd.options?.find((o: any) => o.key === 'message')?.value || '';
            return message ? [{ key: 'message', value: message }] : [];
        }
        if (cmd.key === 'set_value') {
            const column = cmd.options?.find((o: any) => o.key === 'column')?.value || '';
            const value = cmd.options?.find((o: any) => o.key === 'input')?.value || '';
            return column ? [{ key: column, value }] : [];
        }
        return [];
    }

    getForEachRelation = (cmd: any) => cmd.options?.find((o: any) => o.key === 'relation')?.value || '';
    getForEachVariable = (cmd: any) => cmd.options?.find((o: any) => o.key === 'variable')?.value || 'item';

    getNestedConditionsFlat(cmd: any): { groupIndex: number; index: number; column: string; label: string; input: string }[] {
        const result: any[] = [];
        (cmd.conditions || []).forEach((group: any[], groupIndex: number) => {
            group.forEach((cond: any, index: number) => {
                result.push({
                    groupIndex, index,
                    column: cond.options?.find((o: any) => o.key === 'column')?.value || '',
                    label: SENTINEL_CONDITIONS.find((x) => x.key === cond.key)?.label || cond.key || 'Unknown',
                    input: cond.options?.find((o: any) => o.key === 'input')?.value || '',
                });
            });
        });
        return result;
    }

    addForEachCondition(cmdIndex: number) {
        this.commands.update((cmds) => {
            const updated = [...cmds];
            if (!updated[cmdIndex].conditions) updated[cmdIndex].conditions = [];
            updated[cmdIndex] = { ...updated[cmdIndex], conditions: [...updated[cmdIndex].conditions, [{ key: 'none' }]] };
            return updated;
        });
        this.#updateCommands();
    }

    addForEachAction(cmdIndex: number) {
        this.commands.update((cmds) => {
            const updated = [...cmds];
            if (!updated[cmdIndex].actions) updated[cmdIndex].actions = [];
            updated[cmdIndex] = { ...updated[cmdIndex], actions: [...updated[cmdIndex].actions, { key: 'none' }] };
            return updated;
        });
        this.#updateCommands();
    }

    editForEachCondition(cmdIndex: number, groupIndex: number, condIndex: number) {
        const cmd = this.commands()[cmdIndex];
        const condition = cmd.conditions?.[groupIndex]?.[condIndex];
        if (!condition) return;

        const variableName = cmd.options?.find((o: any) => o.key === 'variable')?.value || 'item';
        const relationName = cmd.options?.find((o: any) => o.key === 'relation')?.value || '';
        const variableTable = this.#getRelationTable(relationName);

        this.#modal
            .open(ProfileSentinelConditionModalComponent, this.sentinel(), {
                nested: true, nestedData: condition,
                variableContext: variableTable ? { name: variableName, table: variableTable } : undefined,
                onSave: (updatedCondition: any) => {
                    this.commands.update((cmds) => {
                        const updated = [...cmds];
                        updated[cmdIndex].conditions[groupIndex][condIndex] = updatedCondition;
                        return updated;
                    });
                    this.#updateCommands();
                },
            })
            .then(() => this.#reload());
    }

    #getRelationTable(relationPath: string): string | undefined {
        const s = this.sentinel();
        if (!s?.table_name || !relationPath) return undefined;
        const triggerVar = s.trigger_variable || '';
        const path = triggerVar && relationPath.startsWith(triggerVar + '.') ? relationPath.substring(triggerVar.length + 1) : relationPath;
        let currentTable = s.table_name;
        for (const part of path.split('.')) {
            const relation = this.#global.relations.find((r: any) => r.table === currentTable)?.relations?.[part];
            if (!relation?.model) return undefined;
            currentTable = relation.model.toLowerCase();
        }
        return currentTable;
    }

    editForEachAction(cmdIndex: number, actionIndex: number) {
        const cmd = this.commands()[cmdIndex];
        const action = cmd.actions?.[actionIndex];
        if (!action) return;

        const loopVariable = cmd.options?.find((o: any) => o.key === 'variable')?.value || 'item';
        const loopTable = this.#getRelationTable(cmd.options?.find((o: any) => o.key === 'relation')?.value || '');

        this.#modal
            .open(ProfileSentinelCommandModalComponent, this.sentinel(), {
                nested: true, nestedData: action, loopVariable, loopTable,
                onSave: (updatedAction: any) => {
                    this.commands.update((cmds) => {
                        const updated = [...cmds];
                        updated[cmdIndex].actions[actionIndex] = updatedAction;
                        return updated;
                    });
                    this.#updateCommands();
                },
            })
            .then(() => this.#reload());
    }

    deleteForEachCondition(cmdIndex: number, groupIndex: number, condIndex: number, event: Event) {
        event.stopPropagation();
        this.commands.update((cmds) => {
            const updated = [...cmds];
            const conditions = [...(updated[cmdIndex].conditions || [])];
            const group = [...conditions[groupIndex]];
            group.splice(condIndex, 1);
            if (group.length === 0) conditions.splice(groupIndex, 1);
            else conditions[groupIndex] = group;
            updated[cmdIndex] = { ...updated[cmdIndex], conditions };
            return updated;
        });
        this.#updateCommands();
    }

    deleteForEachAction(cmdIndex: number, actionIndex: number, event: Event) {
        event.stopPropagation();
        this.commands.update((cmds) => {
            const updated = [...cmds];
            const actions = [...(updated[cmdIndex].actions || [])];
            actions.splice(actionIndex, 1);
            updated[cmdIndex] = { ...updated[cmdIndex], actions };
            return updated;
        });
        this.#updateCommands();
    }

    editTrigger = () => this.#modal.open(ProfileSentinelTriggerModalComponent, this.sentinel()).then(() => this.#reload());

    editCondition(colIndex: number, rowIndex: number) {
        this.#modal.open(ProfileSentinelConditionModalComponent, this.sentinel(), { column: colIndex, row: rowIndex }).then(() => this.#reload());
    }

    editCommand = (index: number) => this.#modal.open(ProfileSentinelCommandModalComponent, this.sentinel(), index).then(() => this.#reload());

    addCondition() {
        if (!this.sentinel()) return;
        this.conditions.update((c) => [...c, [{ key: 'none' }]]);
        this.#updateConditions();
    }

    addConditionToGroup(colIndex: number) {
        if (!this.sentinel()) return;
        this.conditions.update((c) => {
            const updated = [...c];
            updated[colIndex] = [...updated[colIndex], { key: 'none' }];
            return updated;
        });
        this.#updateConditions();
    }

    deleteCondition(colIndex: number, rowIndex: number) {
        if (!this.sentinel()) return;
        this.conditions.update((c) => {
            const updated = [...c];
            updated[colIndex] = [...updated[colIndex]];
            updated[colIndex].splice(rowIndex, 1);
            if (updated[colIndex].length === 0) updated.splice(colIndex, 1);
            return updated;
        });
        this.#updateConditions();
    }

    addCommand() {
        if (!this.sentinel()) return;
        this.commands.update((c) => [...c, { key: 'none' }]);
        this.#updateCommands();
    }

    deleteCommand(index: number) {
        if (!this.sentinel()) return;
        this.commands.update((c) => { const u = [...c]; u.splice(index, 1); return u; });
        this.#updateCommands();
    }

    #updateConditions() {
        const s = this.sentinel()!;
        s.condition = JSON.stringify(this.conditions());
        s.update({ condition: s.condition }).subscribe((_) => {
            this._sentinel.set(Sentinel.fromJson(_));
            this.#parseConditions();
        });
    }

    #updateCommands() {
        const s = this.sentinel()!;
        s.result = JSON.stringify(this.commands());
        s.update({ result: s.result }).subscribe((_) => {
            this._sentinel.set(Sentinel.fromJson(_));
            this.#parseCommands();
        });
    }

    #reload() {
        const s = this.sentinel();
        if (!s) return;
        this.#sentinelService.show(String(s.id)).subscribe((_) => {
            this._sentinel.set(Sentinel.fromJson(_));
            this.#parseConditions();
            this.#parseCommands();
            this.checkCircularReferences();
        });
    }
}
