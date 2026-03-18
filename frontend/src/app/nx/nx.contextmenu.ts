import { Component, ElementRef, HostListener, Renderer2, ViewChild, inject, OnInit } from "@angular/core";
import { NxAction } from "./nx.actions";
import { ContextMenuTrigger, NxService } from "./nx.service";
import { NgbDropdown, NgbDropdownMenu } from "@ng-bootstrap/ng-bootstrap";
import { AutopositionDirective } from "src/directives/autoposition.directive";
import { NxDropdown } from "./nx.dropdown";
import { NxGlobal } from "./nx.global";
import { Serializable } from "@models/serializable";

@Component({
    selector: 'nx-contextmenu',
    templateUrl: 'nx.contextmenu.html',
    standalone: true,
    imports: [NxDropdown, NgbDropdown, NgbDropdownMenu]
})
export class NxContextMenu implements OnInit {

    static _track_id = 0
    static getTrackId() { return ++this._track_id }
    
    @ViewChild(NgbDropdown) ngbDropdown:NgbDropdown
    @ViewChild('dropdown', { read: ElementRef }) dropdown:ElementRef
    @HostListener('window:keydown', ['$event']) onDocumentKeyDown = (event: KeyboardEvent) => this.#service.onDocumentKeyDown(event) 

    actions:NxAction[] = []
    #service:NxService = inject(NxService)
    #re:Renderer2 = inject(Renderer2)    

    ngOnInit() {
        this.#service.onContextMenu.subscribe(_ => this.onNewContextMenu(_))
    }
  
    onNewContextMenu = (e:ContextMenuTrigger) => {
        
        this.ngbDropdown?.close()
        NxGlobal.context = e.objects[0].nx instanceof Serializable ? (e.objects[0].nx as Serializable) : undefined

        let sameClass:boolean = true // check if all objects have the same class

        e.objects.forEach(_ => sameClass &&= (_.nx.class === e.objects[0].nx.class))
        if (!sameClass) return console.error('different classes have been selected')
        if (e.objects.length === 0) return console.error('no objects selected')
        
        this.actions = NxService.filteredActions(e.objects)
        
        this.#re.setStyle(this.dropdown.nativeElement, 'left', (e.event.clientX - 20) + 'px')
        this.#re.setStyle(this.dropdown.nativeElement, 'top', (e.event.clientY - 20) + 'px')
        
        this.ngbDropdown.open()
        setTimeout(() => {
            AutopositionDirective.reposition(this.dropdown, this.#re)
        })
        
    }
    applicable = (a:NxAction, isSingle:boolean):boolean => {
        if (a.group || isSingle) return false
        return a.on ? a.on() : true
    }
}