import { Injectable } from '@angular/core';

export interface ToolbarAction {
    id: string;
    label: string;
    icon?: string;
    action: () => void;
}

@Injectable({
    providedIn: 'root'
})
export class ToolbarService {

    #actions: ToolbarAction[] = [];

    setActions = (actions: ToolbarAction[]) => this.#actions = actions;
    getActions = (): ToolbarAction[] => this.#actions;
    clearActions = () => this.#actions = [];

}