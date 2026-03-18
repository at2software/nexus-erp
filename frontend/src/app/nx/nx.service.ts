import { Nx } from './nx.directive';
import { EventEmitter, Injectable, Injector, inject } from '@angular/core';
import { NxAction, NxActionType } from './nx.actions';
import { HotkeyDirective } from 'src/directives/hotkey.directive';
import { Router } from '@angular/router';
import { GlobalService } from 'src/models/global.service';
import { NxGlobal } from './nx.global';
import { NexusHttpService } from 'src/models/http/http.nexus';
import { Observable } from 'rxjs';
import { Serializable } from 'src/models/serializable';
import { HttpClient } from '@angular/common/http';
import { PluginInstanceFactory } from 'src/models/http/plugin.instance.factory';
import { ModalBaseService } from '../_modals/modal-base-service';
import { Title } from '@angular/platform-browser';
import { MODEL_REGISTRY_TOKEN } from '@constants/model-registry.token';

const DOUBLE_CLICK_INTERVAL = 200

const csub = (_:NxAction[]):NxAction[] => {
    const data:NxAction[] = []
    _.forEach(s => data.push(...sub(s)))
    return data
}
const sub = (_:NxAction):NxAction[] => {
    const data = [_]
    if (_.children) data.push(...csub(resolved(_.children)))
    return data
}

export const resolved = <T>(_: T | (() => T)): T => typeof _ == 'function' ? (_ as any)() : _

export interface ContextMenuTrigger {
    objects: Nx[],
    event: MouseEvent
}

@Injectable({ providedIn: 'root' })
export class NxService {

    #doubleClickTimeout?: any
    #doubleClickObject?: Nx
    #lastObject:Nx|undefined
    selected: Nx[] = []
    #service  = inject(NexusHttpService<any>)
    #router   = inject(Router)
    #injector = inject(Injector)
    #glob     = inject(GlobalService)
    #http     = inject(HttpClient)
    #modal    = inject(ModalBaseService)
    #title    = inject(Title)
    pluginInstanceFactory = inject(PluginInstanceFactory)
    MODEL_REGISTRY_TOKEN = inject(MODEL_REGISTRY_TOKEN)
    interruptResult:any = undefined

    constructor() {
        NxGlobal.service  = this.#service
        NxGlobal.router   = this.#router
        NxGlobal.injector = this.#injector
        NxGlobal.global   = this.#glob
        NxGlobal.http     = this.#http
        NxGlobal.title    = this.#title
        NxGlobal.nxService = this
        NxGlobal.MODEL_REGISTRY_TOKEN = this.MODEL_REGISTRY_TOKEN
    }

    onContextMenu = new EventEmitter<ContextMenuTrigger>()

    propagateGlobalSelection = () => this.#glob.registerSelectedObject(this.selected.map(_ => _.nx), false)
    deselectAll = () => {
        this.unselectAll()
        this.propagateGlobalSelection()
    }
    onClick = (o: Nx) => {
        this.#doubleClickObject = o
        this.onSingleClick(o)

        if (this.#doubleClickTimeout) {
            clearTimeout(this.#doubleClickTimeout)
            if (this.#doubleClickObject == o) this.onDoubleClick(o)
        }
        this.#doubleClickTimeout = setTimeout(() => this.#doubleClickTimeout = undefined, DOUBLE_CLICK_INTERVAL)
    }
    onSingleClick = (o: Nx) => {
        if (!this.#isSelected(o)) {
            this.unselectAll()
            this.select(o)
        }
        this.propagateGlobalSelection()
    }
    onDoubleClick = (o: Nx) => {
        this.unselectAll()
        this.select(o)
        if (o.nx.doubleClickAction in o.nx.actions) {
            this.triggerAction(o.nx.actions[o.nx.doubleClickAction])
        }
    }
    onCtrlShiftClick = (o: Nx, event: MouseEvent) => {
        // CTRL+SHIFT+Click: Open primary action in new tab
        event.preventDefault()
        this.unselectAll()
        this.select(o)
        
        // First, try to get the frontend URL from the object
        const url = o.nx.frontendUrl?.()
        if (url) {
            window.open(url, '_blank')
            return
        }
        
        // Fallback: execute action normally if no URL is available
        if (o.nx.doubleClickAction in o.nx.actions) {
            this.triggerAction(o.nx.actions[o.nx.doubleClickAction])
        }
    }
    getParent = () => this.#lastObject?.el.nativeElement.parentElement
    getSiblings = () => [...this.getParent()?.children ?? []].filter((_:any) => 'nx' in _)     // spread operator to convert HTMLCollection to Array
    selectWith = <T extends Serializable>(predict:(_:T)=>boolean) => {
        this.unselectAll()
        this.getSiblings().forEach((_:any) => {
            if (predict(_.nx.nx)) {
                this.select(_.nx)
            } 
        })
        this.propagateGlobalSelection()
    }
    onRange = (o: Nx) => {
        if (this.selected.length === 0) {
            return this.onSingleClick(o)
        }
        const last: Nx = this.selected.last()!
        const parent = last.el.nativeElement.parentElement
        if (o.el.nativeElement.parentElement != parent) {
            return this.onSingleClick(o)  // not in the same parent, start new selection
        }
        let mark = false
        for (const c of parent.children) {
            if ('nx' in c) {
                const nx = c.nx
                if (nx == last || nx == o) {
                    mark = !mark
                }
                else if (mark) {
                    this.toggle(nx)
                }
            }
        }
        this.toggle(o)
        this.propagateGlobalSelection()
    }
    onRightClick = (o: Nx, event: MouseEvent) => {
        this.onSingleClick(o)
        this.onContextMenu.emit({ objects: this.selected, event: event })
    }
    toggle = (o: Nx): Nx => {
        if (this.#isSelected(o)) { this.unselect(o) } else { this.select(o) }
        this.propagateGlobalSelection()
        return o
    }

    unselect = (o: Nx) => {
        this.selected = this.selected.filter(_ => _ != o)
        return o.setSelected(false)
    }
    select = (o: Nx) => {
        this.selected.push(o);
        return o.setSelected(true)
    }
    unselectAll = () => {
        this.selected.forEach(_ => _.setSelected(false));
        this.selected = [];
    }
    #isSelected = (o: Nx): boolean => this.selected.includes(o)

    /** ACTION HANDLING */
    static _filteredActions(actions:NxAction[]):NxAction[] {
        const selectionCount = NxGlobal.nxService.selected.length
        if (selectionCount === 0) return []
        actions.forEach(action => action.children?.length && (action.children = NxService._filteredActions(resolved(action.children ?? []))))
        return actions.filter(action => {
            if (NxGlobal.nxService.selected.length) {
                const dom = NxGlobal.nxService.selected[0]
                const domContext = dom.context?.toLocaleLowerCase()
                if (action.context) {
                    const context = action.context.split(',')
                    for (const c of context) {
                        if (c.startsWith('!') && c.substring(1).toLowerCase() === domContext) {
                            return false
                        }
                        if (!c.startsWith('!') && c.toLowerCase() !== domContext) {
                            return false
                        }
                    }
                }
            }
            if (selectionCount > 1 && !action.group) {
                return false
            }
            // Check RBAC roles (pipe-separated: "admin|invoicing")
            if (action.roles) {
                const requiredRoles = action.roles.split('|').map(r => r.trim()).filter(Boolean)
                if (!NxGlobal.global.user?.hasAnyRole(requiredRoles)) {
                    return false
                }
            }
            return action.on ? action.on() : true
        })

    }
    

    static filteredActions = (objects:Nx[]):NxAction[] => NxService._filteredActions(objects.first()?.nx.actions ?? [])
    static flatActions = (_:NxAction[]):NxAction[] => [...csub(_)]
    #flatActions = ():NxAction[] => NxService.flatActions(NxService.filteredActions(this.selected))

    onDocumentKeyDown(event: KeyboardEvent) {
        if (event.key == 'Escape') {
            this.deselectAll()
            return
        }
        if (this.selected.length) {
            const flat = this.#flatActions().filter(x => 'hotkey' in x)
            flat.forEach(action => {
                const applies = HotkeyDirective.applies(event, action.hotkey!)
                if (action.hotkey && applies) {
                    event.stopPropagation()
                    event.preventDefault()
                    this.triggerAction(action)
                }
            })            
        }
    }

    triggerAction = (_action: NxAction) => {
        
        const propagateFinalized = (e: NxAction) => {
            this.#lastObject?.actionsResolved.emit({ action: e, object: this.#lastObject, remaining: 0 })
        }
        const propagate = (e: NxAction, remaining: number) => this.#lastObject?.singleActionResolved.emit({ action: e, object: this.#lastObject, remaining: remaining })
        
        if (this.selected.length === 0) return

        const firstAction = NxService.flatActions(this.selected[0].nx.actions).filter(_ => _.title == _action.title)

        if (firstAction.filter(_ => 'action' in _).length === 0) {
            this.#lastObject = this.selected[0]
            propagate(_action, 0)
            propagateFinalized(_action)
            return     // this is to avoid triggerAction() for parent menus
        }

        this.#lastObject = this.selected[0]

        let interrupt = undefined
        if (firstAction[0].interrupt) {
            const v = firstAction[0].interrupt
            interrupt = this.#modal.open(v.service, v.args)
        } else {
            interrupt = new Promise<void>(_ => _()) // empty promise that triggers instantly
        }

        interrupt.then((result:any) => {
            this.interruptResult = result
            let stackCount = this.selected.length   
            this.selected.forEach((sel) => {
                const action = NxService.flatActions(sel.nx.actions).filter(_ => _.title == _action.title)[0]
                if (action.action) {
                    const resolve = (data:any = undefined) => {
                        stackCount--
                        propagate(action, stackCount)
                        if (action.type === NxActionType.Destructive && sel.tables) {
                            const tables = Array.isArray(sel.tables) ? sel.tables : [sel.tables]
                            if (sel.nx) {
                                if (!tables.includes(sel.nx)) {
                                    const f = tables.find(_ => _.track_id === sel.nx!.track_id)
                                    if (f) {
                                        tables.remove(f)
                                    }
                                } else {
                                    tables.remove(sel.nx)
                                }
                            }
                        }
                        if (data && action.type === NxActionType.Creative && sel.tables) {
                            const tables = Array.isArray(sel.tables) ? sel.tables : [sel.tables]
                            tables.push(data)
                        }
                        if (stackCount === 0) {
                            propagateFinalized(action)
                        }
                    }
                    const actionType = action.action(() => resolve(undefined), sel.nxContext)
                    if ((actionType as any) instanceof Promise) {
                        (actionType as unknown as Promise<any>).then(response => {
                            if (response) {
                                resolve(undefined)
                            }
                        })
                    }
                    if ((actionType as any) instanceof Observable) { // action function yields only observable, needs to be subscribed now
                        (actionType as unknown as Observable<any>).subscribe((data) => resolve(data))
                    }
                } else {
                    stackCount--
                    propagate(action, stackCount)
                    if (stackCount === 0) {
                        propagateFinalized(action)
                    }
                }
            })
        }).
        catch(). 
        finally(()=> {
            if (!('unselectsingleActionResolved' in firstAction[0]) || firstAction[0].unselectsingleActionResolved === true) {
                this.unselectAll()
            }
        })
    }
}
