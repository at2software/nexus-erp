import { Directive, EventEmitter, inject, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { GlobalService } from '@models/global.service';
import { Subject, takeUntil } from 'rxjs';

@Directive()
export abstract class TabTasksBaseComponent implements OnInit, OnDestroy {

    @Input() roles?: string
    @Output() countChanged = new EventEmitter<number>()

    protected destroy$ = new Subject<void>()
    protected global = inject(GlobalService)

    ngOnInit() {
        this.global.init.pipe(takeUntil(this.destroy$)).subscribe(() => {
            if (this.#hasRoles()) this.reload()
        })
    }

    ngOnDestroy() {
        this.destroy$.next()
        this.destroy$.complete()
    }

    abstract reload(): void

    #hasRoles(): boolean {
        if (!this.roles) return true
        const roleNames = this.roles.split('|').map(r => r.trim()).filter(Boolean)
        return this.global.user?.hasAnyRole(roleNames) ?? false
    }
}
