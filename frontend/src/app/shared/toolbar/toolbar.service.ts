import { Service } from '@angular/core';

export interface ToolbarAction {
    id: string;
    label: string;
    icon?: string;
    action: () => void;
}

@Service()
export class ToolbarService {
    #actions: ToolbarAction[] = [];

    setActions = (actions: ToolbarAction[]) => (this.#actions = actions);
    getActions = (): ToolbarAction[] => this.#actions;
    clearActions = () => (this.#actions = []);
}
