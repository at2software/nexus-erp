import type { NxAction } from './nx.actions';

export interface INxContextMenu {
    actions: NxAction[];
    class: string;
    track_id: number;
    frontendUrl?: () => string | undefined; // optional for double click opening
}
