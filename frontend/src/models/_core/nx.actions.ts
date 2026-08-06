import { INxContextMenu } from './nx.contextmenu.interface';
import { ModalRef } from './modal-registry';

export type NxActionResolve = (success?: (v: unknown) => void, nxContext?: unknown, interruptResult?: unknown) => unknown;
export enum NxActionType {
    Destructive = 1,
    Creative = 2,
    Update = 3,
    Default = 4,
}

export interface NxAction {
    title: string;
    action?(success?: (v: unknown) => void, nxContext?: unknown, interruptResult?: unknown): unknown;
    group?: boolean;
    label?: string;
    hotkey?: string;
    on?: () => boolean;
    children?: NxAction[] | (() => NxAction[]);
    interrupt?: { service: ModalRef; args: unknown };
    type?: NxActionType | ((context?: string) => NxActionType | undefined);
    roles?: string | null;
    unselectsingleActionResolved?: boolean;
    context?: string;
    doubleClick?: boolean;

    id?: string;
    object?: INxContextMenu;
}

export function resolveDoubleClickAction(actions: NxAction[]): NxAction | undefined {
    const targets = actions.filter((_) => _.doubleClick);
    if (targets.length > 1) {
        console.warn(`multiple actions define doubleClick, using "${targets[0].title}"`, targets.map((_) => _.title));
    }
    return targets[0];
}
