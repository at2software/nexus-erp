import { INxContextMenu } from "./nx.contextmenu.interface";

export type NxActionResolve = (success?: (v: any) => void, nxContext?: any) => void
export enum NxActionType {
    Destructive = 1,
    Creative = 2,
}

export interface NxAction {
    title            : string,                            // title to be displayed
    action          ?: NxActionResolve,                   // what happens after this action has been triggered,  will be automatically subscribed, if type observable
    group           ?: boolean,                           // whether this command can also be applied to multiple selected of the same type
    label           ?: string,                            // right-side label of contextmenu
    hotkey          ?: string,                            // global hotkey
    on              ?: () => boolean,                     // test on when to be shown in contextmenu
    children        ?: NxAction[] | (() => NxAction[]),
    interrupt       ?: { service: any, args: any },
    type            ?: NxActionType
    roles           ?: string
    unselectsingleActionResolved?: boolean
    context         ?: string

        // handling
    id    ?: string,
    object?: INxContextMenu
}