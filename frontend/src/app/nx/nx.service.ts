import { Nx } from './nx.directive';
import { Injectable, Injector, inject } from '@angular/core';
import { NxAction, NxActionType } from './nx.actions';
import { HotkeyDirective } from '@directives/hotkey.directive';
import { Router } from '@angular/router';
import { GlobalService } from '@models/global.service';
import { NxGlobal } from './nx.global';
import { NexusHttpService } from '@models/http/http.nexus';
import { Observable, Subject } from 'rxjs';
import { Serializable } from '@models/serializable';
import { HttpClient } from '@angular/common/http';
import { PluginInstanceFactory } from '@models/http/plugin.instance.factory';
import { ModalBaseService } from '../_modals/modal-base-service';
import { Title } from '@angular/platform-browser';
import { MODEL_REGISTRY_TOKEN } from '@constants/model-registry.token';

const DOUBLE_CLICK_INTERVAL = 200;

const csub = (_: NxAction[]): NxAction[] => _.flatMap(sub);
const sub = (_: NxAction): NxAction[] => {
    const data = [_];
    if (_.children) data.push(...csub(resolved(_.children)));
    return data;
};

export const resolved = <T>(_: T | (() => T)): T => (typeof _ == 'function' ? (_ as any)() : _);

export interface ContextMenuTrigger {
    objects: Nx[];
    event: MouseEvent;
}

@Injectable({ providedIn: 'root' })
export class NxService {
    #doubleClickTimeout?: ReturnType<typeof setTimeout>;
    #doubleClickObject?: Nx;
    #lastObject?: Nx;
    #interruptResult: any;
    selected: Nx[] = [];
    #service = inject(NexusHttpService<any>);
    #router = inject(Router);
    #injector = inject(Injector);
    #glob = inject(GlobalService);
    #http = inject(HttpClient);
    #title = inject(Title);
    #modalSvc = inject(ModalBaseService);
    pluginInstanceFactory = inject(PluginInstanceFactory);
    MODEL_REGISTRY_TOKEN = inject(MODEL_REGISTRY_TOKEN);

    constructor() {
        NxGlobal.service = this.#service;
        NxGlobal.router = this.#router;
        NxGlobal.injector = this.#injector;
        NxGlobal.global = this.#glob;
        NxGlobal.http = this.#http;
        NxGlobal.title = this.#title;
        NxGlobal.nxService = this;
        NxGlobal.modalService = this.#modalSvc;
        NxGlobal.MODEL_REGISTRY_TOKEN = this.MODEL_REGISTRY_TOKEN;
    }

    #onContextMenuSubject = new Subject<ContextMenuTrigger>();
    onContextMenu = this.#onContextMenuSubject.asObservable();

    propagateGlobalSelection = () =>
        this.#glob.registerSelectedObject(
            this.selected.map((_) => _.nx()),
            false,
        );

    deselectAll = () => {
        this.unselectAll();
        this.propagateGlobalSelection();
    };

    onClick = (o: Nx) => {
        if (this.#doubleClickTimeout && this.#doubleClickObject === o) {
            clearTimeout(this.#doubleClickTimeout);
            this.#doubleClickTimeout = undefined;
            this.onDoubleClick(o);
        } else {
            if (this.#doubleClickTimeout) clearTimeout(this.#doubleClickTimeout);
            this.#doubleClickObject = o;
            this.onSingleClick(o);
            this.#doubleClickTimeout = setTimeout(() => (this.#doubleClickTimeout = undefined), DOUBLE_CLICK_INTERVAL);
        }
    };

    onSingleClick = (o: Nx) => {
        if (!this.#isSelected(o)) {
            this.unselectAll();
            this.select(o);
        }
        this.propagateGlobalSelection();
    };

    onDoubleClick = (o: Nx) => {
        this.unselectAll();
        this.select(o);
        const nx = o.nx();
        if (nx.doubleClickAction in nx.actions) {
            this.triggerAction(nx.actions[nx.doubleClickAction]);
        }
    };

    onCtrlShiftClick = (o: Nx, event: MouseEvent) => {
        // CTRL+SHIFT+Click: Open primary action in new tab
        event.preventDefault();
        this.unselectAll();
        this.select(o);
        const nx = o.nx();
        const url = nx.frontendUrl?.();
        if (url) {
            window.open(url, '_blank');
            return;
        }
        if (nx.doubleClickAction in nx.actions) {
            this.triggerAction(nx.actions[nx.doubleClickAction]);
        }
    };

    getParent = () => this.#lastObject?.el.nativeElement.parentElement;
    getSiblings = () => [...(this.getParent()?.children ?? [])].filter((_: any) => 'nx' in _); // spread converts HTMLCollection to Array

    selectWith = <T extends Serializable>(predict: (_: T) => boolean) => {
        this.unselectAll();
        this.getSiblings().forEach((_: any) => {
            if (predict(_.nx.nx())) this.select(_.nx);
        });
        this.propagateGlobalSelection();
    };

    onRange = (o: Nx) => {
        if (this.selected.length === 0) return this.onSingleClick(o);
        const last: Nx = this.selected.last()!;
        const parent = last.el.nativeElement.parentElement;
        if (o.el.nativeElement.parentElement != parent) return this.onSingleClick(o);
        let mark = false;
        for (const c of parent.children) {
            if ('nx' in c) {
                const nx = c.nx;
                if (nx == last || nx == o) mark = !mark;
                else if (mark) this.toggle(nx);
            }
        }
        this.toggle(o);
        this.propagateGlobalSelection();
    };

    onRightClick = (o: Nx, event: MouseEvent) => {
        this.onSingleClick(o);
        this.#onContextMenuSubject.next({ objects: this.selected, event: event });
    };

    toggle = (o: Nx): Nx => {
        this.#isSelected(o) ? this.unselect(o) : this.select(o);
        this.propagateGlobalSelection();
        return o;
    };

    unselect = (o: Nx) => {
        this.selected = this.selected.filter((_) => _ != o);
        return o.setSelected(false);
    };
    select = (o: Nx) => {
        this.selected.push(o);
        return o.setSelected(true);
    };
    unselectAll = () => {
        this.selected.forEach((_) => _.setSelected(false));
        this.selected = [];
    };
    #isSelected = (o: Nx): boolean => this.selected.includes(o);

    static _filteredActions(actions: NxAction[]): NxAction[] {
        const selectionCount = NxGlobal.nxService.selected.length;
        if (selectionCount === 0) return [];

        const dom = NxGlobal.nxService.selected[0];
        const domContext = dom.context()?.toLocaleLowerCase();

        return actions
            .filter((action) => {
                if (action.context) {
                    const context = action.context.split(',');
                    for (const c of context) {
                        if (c.startsWith('!') && c.substring(1).toLowerCase() === domContext) return false;
                        if (!c.startsWith('!') && c.toLowerCase() !== domContext) return false;
                    }
                }
                if (selectionCount > 1 && !action.group) return false;
                if (action.roles) {
                    const requiredRoles = action.roles.split('|').map((r) => r.trim()).filter(Boolean);
                    if (!NxGlobal.global.user?.hasAnyRole(requiredRoles)) return false;
                }
                return action.on ? action.on() : true;
            })
            .map((action) =>
                action.children?.length
                    ? { ...action, children: NxService._filteredActions(resolved(action.children)) }
                    : action,
            );
    }

    static filteredActions = (objects: Nx[]): NxAction[] => NxService._filteredActions(objects.first()?.nx().actions ?? []);
    static flatActions = (_: NxAction[]): NxAction[] => [...csub(_)];
    #flatActions = (): NxAction[] => NxService.flatActions(NxService.filteredActions(this.selected));

    onDocumentKeyDown(event: KeyboardEvent) {
        if (event.key == 'Escape') {
            this.deselectAll();
            return;
        }
        if (this.selected.length) {
            this.#flatActions()
                .filter((x) => 'hotkey' in x)
                .forEach((action) => {
                    if (HotkeyDirective.applies(event, action.hotkey!)) {
                        event.stopPropagation();
                        event.preventDefault();
                        this.triggerAction(action);
                    }
                });
        }
    }

    triggerAction = (_action: NxAction) => {
        if (this.selected.length === 0) return;

        const propagate = (e: NxAction, remaining: number) =>
            this.#lastObject?.singleActionResolved.emit({ action: e, object: this.#lastObject, remaining });

        const propagateFinalized = (e: NxAction) => {
            NxGlobal.global.onActionsResolved.next({ object: this.#lastObject!.nx(), action: e });
            this.#lastObject?.actionsResolved.emit({ action: e, object: this.#lastObject, remaining: 0 });
        };

        this.#lastObject = this.selected[0];
        const matchedActions = NxService.flatActions(this.selected[0].nx().actions).filter((_) => _.title == _action.title);

        if (!matchedActions.some((_) => 'action' in _)) {
            propagate(_action, 0);
            propagateFinalized(_action);
            return;
        }

        const interrupt = matchedActions[0].interrupt
            ? NxGlobal.modalService.open(matchedActions[0].interrupt.service, matchedActions[0].interrupt.args)
            : Promise.resolve();

        interrupt
            .then((result: any) => {
                this.#interruptResult = result;
                let stackCount = this.selected.length;
                this.selected.forEach((sel) => {
                    const selNx = sel.nx();
                    const selTables = sel.tables();
                    const action = NxService.flatActions(selNx.actions).find((_) => _.title == _action.title);
                    if (action?.action) {
                        const resolve = (data: any = undefined) => {
                            stackCount--;
                            propagate(action, stackCount);
                            const resolvedType = typeof action.type === 'function' ? action.type(sel.context()) : action.type;
                            if (resolvedType === NxActionType.Destructive && selTables) {
                                const tables = Array.isArray(selTables) ? selTables : [selTables];
                                const target = tables.includes(selNx) ? selNx : tables.find((_) => _.track_id === selNx.track_id);
                                if (target) tables.remove(target);
                            }
                            if (data && resolvedType === NxActionType.Creative && Array.isArray(selTables)) {
                                selTables.push(data);
                            }
                            if (stackCount === 0) propagateFinalized(action);
                        };
                        const actionType = action.action(resolve, sel.nxContext(), this.#interruptResult);
                        if ((actionType as any) instanceof Promise) {
                            (actionType as any as Promise<any>).then((response) => { if (response) resolve(response); });
                        } else if ((actionType as any) instanceof Observable) {
                            (actionType as any as Observable<any>).subscribe(resolve);
                        }
                    } else {
                        stackCount--;
                        propagate(_action, stackCount);
                        if (stackCount === 0) propagateFinalized(_action);
                    }
                });
            })
            .catch()
            .finally(() => {
                if (!('unselectsingleActionResolved' in matchedActions[0]) || matchedActions[0].unselectsingleActionResolved === true) {
                    this.unselectAll();
                }
            });
    };
}
