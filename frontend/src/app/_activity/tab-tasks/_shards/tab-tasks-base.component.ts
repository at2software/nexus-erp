import { afterNextRender, DestroyRef, Directive, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GlobalService } from '@models/global.service';

@Directive()
export abstract class TabTasksBaseComponent {
    roles = input<string>();
    countChanged = output<number>();

    protected readonly destroyRef = inject(DestroyRef);
    protected global = inject(GlobalService);

    readonly #collapsed = signal<Set<string>>(new Set());
    toggle = (key: string) => this.#collapsed.update(s => { const n = new Set(s); if (n.has(key)) n.delete(key); else n.add(key); return n; });
    isCollapsed = (key: string) => this.#collapsed().has(key);

    constructor() {
        afterNextRender(() => {
            this.global.init.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
                if (this.#hasRoles()) this.reload();
            });
        });
    }

    abstract reload(): void;

    #hasRoles(): boolean {
        if (!this.roles()) return true;
        const roleNames = this.roles()!
            .split('|')
            .map((r) => r.trim())
            .filter(Boolean);
        return this.global.user?.hasAnyRole(roleNames) ?? false;
    }
}
