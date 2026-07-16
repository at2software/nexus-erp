import { Type } from '@angular/core';
import { INxContextMenu } from './nx.contextmenu.interface';
import { ModalBaseComponent } from '@app/_modals/modal-base.component';

// Action payloads are intentionally dynamic — every model wires up its own shape here, so callers
// narrow the `unknown` parameters to their own context/interrupt type (see `NxAction.action`).
// Return value is checked at runtime (NxService.triggerAction) for Promise/Observable and
// auto-subscribed; anything else (void, Subscription, Window, ...) is ignored.
export type NxActionResolve = (success?: (v: unknown) => void, nxContext?: unknown, interruptResult?: unknown) => unknown;
export enum NxActionType {
    Destructive = 1,
    Creative = 2,
    Update = 3,
    Default = 4,
}

export interface NxAction {
    /** Title to be displayed. */
    title: string;
    /**
     * What happens after this action has been triggered.
     * Will be automatically subscribed if the return type is observable.
     * Declared as a method (not an `NxActionResolve` property) so consumers may narrow
     * `nxContext`/`interruptResult` to their own payload type — method parameters are bivariant
     * under `strictFunctionTypes`, which lets this stay type-safe without `any`.
     */
    action?(success?: (v: unknown) => void, nxContext?: unknown, interruptResult?: unknown): unknown;
    /** Whether this command can also be applied to multiple selected items of the same type. */
    group?: boolean;
    /** Right-side label of the context menu. */
    label?: string;
    /** Global hotkey. */
    hotkey?: string;
    /** Condition to determine when to show this in the context menu. */
    on?: () => boolean;
    children?: NxAction[] | (() => NxAction[]);
    // Modal component opened before the action runs; its own init()/onSuccess() enforce the real shape.
    interrupt?: { service: Type<ModalBaseComponent<unknown>>; args: unknown };
    type?: NxActionType | ((context?: string) => NxActionType | undefined);
    /** Multiple roles can be pipe separated. */
    roles?: string | null;
    unselectsingleActionResolved?: boolean;
    context?: string;

    // handling
    id?: string;
    object?: INxContextMenu;
}
