import { computed, inject, signal, Service } from '@angular/core';
import { GlobalService } from '@models/global.service';
import { User } from '@models/user/user.model';

@Service()
export class HrTeamService {
    readonly #global = inject(GlobalService);

    readonly #selected = signal<User | undefined>(undefined);

    readonly user = computed(() => this.#selected() ?? this.#global.user ?? undefined);
    readonly userId = computed(() => this.user()?.id);

    getUser = (): User | undefined => this.user();
    getUserId = () => this.userId()!;
    setUser = (_: User) => this.#selected.set(_);
}
