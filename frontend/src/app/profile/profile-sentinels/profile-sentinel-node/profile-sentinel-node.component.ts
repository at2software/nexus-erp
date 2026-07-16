import { ObserverTrigger } from '@enums/observer-trigger';
import { SentinelNode } from '@models/sentinels/sentinel-node.model';
import { SentinelNodeType } from '@enums/sentinel-node.type';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Sentinel } from '@models/sentinels/sentinel.model';
import { SENTINEL_CONDITIONS } from '../sentinel-condition.model';
import { SENTINEL_COMMANDS } from '../sentinel-command.model';
import { SentinelOptionFieldType } from '../sentinel-option-field-type.model';
import { SentinelOptionField } from '../sentinel-condition-option-field.model';
import { tracked } from '@constants/tracked';

@Component({
    selector: 'profile-sentinel-node',
    templateUrl: './profile-sentinel-node.component.html',
    styleUrl: './profile-sentinel-node.component.scss',
    imports: [],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileSentinelNodeComponent {
    readonly node = input.required<SentinelNode>();
    readonly trackedNode = tracked(this.node);
    readonly sentinel = input.required<Sentinel>();
    readonly trackedSentinel = tracked(this.sentinel);
    width = input<number>(0);
    height = input<number>(0);
    column = input<number>(0);
    row = input<number>(0);

    deleteNode = output<void>();
    editNode = output<void>();

    readonly SentinelNodeType = SentinelNodeType;
    readonly ObserverTrigger = ObserverTrigger;
    readonly allConditions = SENTINEL_CONDITIONS;
    readonly allCommands = SENTINEL_COMMANDS;

    readonly #parsedCondition = computed(() => {
        if (this.trackedNode().type !== SentinelNodeType.Condition) return null;
        const conditions = JSON.parse(this.trackedSentinel().condition || '[]');
        const col = this.column();
        const row = this.row();
        if (conditions.length <= col || conditions[col].length <= row) return null;
        return conditions[col][row];
    });

    readonly columnOptions = computed<SentinelOptionField[] | undefined>(() => {
        const condition = this.#parsedCondition();
        if (!condition) return undefined;
        const defaultCondition = this.getCondition(condition.key);
        return condition.options?.filter((o: SentinelOptionField) => defaultCondition?.options?.filter((x: SentinelOptionField) => x.key === o.key).first()?.type === SentinelOptionFieldType.Column);
    });

    readonly options = computed<SentinelOptionField[] | undefined>(() => {
        const condition = this.#parsedCondition();
        if (!condition) return undefined;
        const defaultCondition = this.getCondition(condition.key);
        return condition.options?.filter((o: SentinelOptionField) => defaultCondition?.options?.filter((x: SentinelOptionField) => x.key === o.key).first()?.type !== SentinelOptionFieldType.Column);
    });

    readonly commandLabel = computed<string | undefined>(() => {
        const result = this.trackedSentinel().result;
        if (!result) return undefined;
        const commands = JSON.parse(result);
        if (commands.length >= 1) {
            return this.allCommands.filter((c) => c.key === commands[0].key).first()?.label;
        }
        return undefined;
    });

    readonly isCondition = computed(() => this.trackedNode().type === SentinelNodeType.Condition);

    getNodeTypeClass(type: SentinelNodeType) {
        return SentinelNodeType[type].toLocaleLowerCase();
    }

    getCondition(key?: string) {
        if (key === undefined) return undefined;
        return this.allConditions.filter((condition) => condition.key === key).first();
    }
}
