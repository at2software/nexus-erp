import { DestroyRef, Directive, effect, ElementRef, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { GlobalService } from '@models/global.service';
import { RoleService } from '@models/user/role.service';

@Directive({
    selector: '[roles], [noroles]',
})
export class PermissionsDirective {
    readonly roles = input<string>();
    readonly noroles = input<string>();

    readonly #el = inject(ElementRef);
    readonly #router = inject(Router);
    readonly #roleService = inject(RoleService);
    readonly #global = inject(GlobalService);
    readonly #destroyRef = inject(DestroyRef);

    constructor() {
        effect(() => this.#updateVisibility());

        this.#router.events
            .pipe(
                filter((e) => e instanceof NavigationEnd),
                takeUntilDestroyed(this.#destroyRef),
            )
            .subscribe(() => this.#updateVisibility());

        this.#roleService.onUpdate.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => this.#updateVisibility());
    }

    #hasAnyRole(roleString: string): boolean {
        return (
            this.#global.user?.hasAnyRole(
                roleString
                    .split('|')
                    .map((r) => r.trim())
                    .filter(Boolean),
            ) ?? false
        );
    }

    #updateVisibility() {
        const roles = this.roles();
        const noroles = this.noroles();
        if (roles && !this.#hasAnyRole(roles)) this.#el.nativeElement?.remove();
        if (noroles && this.#hasAnyRole(noroles)) this.#el.nativeElement?.remove();
    }
}
