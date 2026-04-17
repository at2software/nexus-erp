import { DestroyRef, Directive, inject, input, OnInit, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GlobalService } from '@models/global.service';

@Directive()
export abstract class TabTasksBaseComponent implements OnInit {

    roles        = input<string>()
    countChanged = output<number>()

    protected readonly destroyRef = inject(DestroyRef)
    protected global = inject(GlobalService)

    ngOnInit() {
        this.global.init.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            if (this.#hasRoles()) this.reload()
        })
    }

    abstract reload(): void

    #hasRoles(): boolean {
        if (!this.roles()) return true
        const roleNames = this.roles()!.split('|').map(r => r.trim()).filter(Boolean)
        return this.global.user?.hasAnyRole(roleNames) ?? false
    }
}
