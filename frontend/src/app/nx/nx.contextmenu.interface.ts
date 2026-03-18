import type { NxAction } from "./nx.actions"

export interface INxContextMenu {
    actions: NxAction[]
    doubleClickAction: number
    class: string
    track_id: number
    frontendUrl?: () => string|undefined    // optional for double click opening
    //getApiPathWithId: () => string
}