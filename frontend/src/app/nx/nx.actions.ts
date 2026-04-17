import { INxContextMenu } from "./nx.contextmenu.interface";

export type NxActionResolve = (success?: (v: any) => void, nxContext?: any) => void
export enum NxActionType {
    Destructive = 1,
    Creative = 2,
}

export interface NxAction {
    /** Title to be displayed. */
    title            : string,
    /**
     * What happens after this action has been triggered.
     * Will be automatically subscribed if the return type is observable.
     */
    action          ?: NxActionResolve,
    /** Whether this command can also be applied to multiple selected items of the same type. */
    group           ?: boolean,
    /** Right-side label of the context menu. */
    label           ?: string,
    /** Global hotkey. */
    hotkey          ?: string,
    /** Condition to determine when to show this in the context menu. */
    on              ?: () => boolean,
    children        ?: NxAction[] | (() => NxAction[]),
    interrupt       ?: { service: any, args: any },
    type            ?: NxActionType
    /** Multiple roles can be pipe separated. */
    roles           ?: string | null
    unselectsingleActionResolved?: boolean
    context         ?: string

        // handling
    id    ?: string,
    object?: INxContextMenu
}