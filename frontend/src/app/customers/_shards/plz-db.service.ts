import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { firstValueFrom, map, shareReplay, tap } from 'rxjs';
import { PlzEntryDto } from '@models/_core/api-response';

@Service()
export class PlzDbService {
    #http = inject(HttpClient);
    #index = new Map<number, PlzEntryDto[]>();

    readonly #index$ = this.#http.get<PlzEntryDto[]>('assets/db/plz.json').pipe(
        map((entries) => this.#buildIndex(entries)),
        tap((index) => {
            this.#index = index;
        }),
        shareReplay(1),
    );

    ensureLoaded = async (): Promise<void> => {
        await firstValueFrom(this.#index$);
    };

    lookup = async (plz: number | string): Promise<PlzEntryDto[]> => {
        const key = this.#normalize(plz);
        if (key === undefined) return [];
        const index = await firstValueFrom(this.#index$);
        return index.get(key) ?? [];
    };

    lookupSync = (plz: number | string): PlzEntryDto[] => {
        const key = this.#normalize(plz);
        if (key === undefined) return [];
        return this.#index.get(key) ?? [];
    };

    #buildIndex = (entries: PlzEntryDto[]): Map<number, PlzEntryDto[]> => {
        const index = new Map<number, PlzEntryDto[]>();

        for (const entry of entries) {
            const key = this.#normalize(entry.plz);
            if (key === undefined) continue;
            const current = index.get(key) ?? [];
            current.push(entry);
            index.set(key, current);
        }

        return index;
    };

    #normalize = (value: number | string): number | undefined => {
        const parsed = Number.parseInt(value.toString(), 10);
        return Number.isNaN(parsed) ? undefined : parsed;
    };
}