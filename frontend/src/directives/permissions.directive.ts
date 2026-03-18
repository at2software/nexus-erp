import { Directive, ElementRef, inject, Input, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { GlobalService } from 'src/models/global.service';
import { RoleService } from '@models/user/role.service';

@Directive({
    selector: '[roles], [noroles]',
    standalone: true
})
export class PermissionsDirective implements OnDestroy, OnInit {

    /** Direct role name(s), pipe-separated: "admin|invoicing" */
    @Input() public roles?: string
    @Input() public noroles?: string

    #subscriptions: Subscription[] = []

    #elementRef  = inject(ElementRef)
    #router      = inject(Router)
    #roleService = inject(RoleService)
    #global      = inject(GlobalService)

    ngOnInit(): void {
        this.#updateVisibility()
        this.#subscribeEvents()
    }

    ngOnDestroy(): void {
        this.#subscriptions.forEach(s => s.unsubscribe())
    }

    #subscribeEvents(): void {
        this.#subscriptions.push(this.#router.events.subscribe(val => {
            if (val instanceof NavigationEnd) this.#updateVisibility()
        }))
        this.#subscriptions.push(this.#roleService.onUpdate.subscribe(() => {
            this.#updateVisibility()
        }))
    }

    #hasAnyRole(roleString: string): boolean {
        const roleNames = roleString.split('|').map(r => r.trim()).filter(Boolean)
        return this.#global.user?.hasAnyRole(roleNames) ?? false
    }

    #updateVisibility(): void {
        if (this.roles && !this.#hasAnyRole(this.roles)) {
            this.#elementRef?.nativeElement?.remove()
        }
        if (this.noroles && this.#hasAnyRole(this.noroles)) {
            this.#elementRef?.nativeElement?.remove()
        }
    }

}
