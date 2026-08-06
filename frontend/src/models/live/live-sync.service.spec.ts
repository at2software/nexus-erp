import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { of, Subject } from 'rxjs';
import { NxStatic } from '@app/nx/nx.static';
import { GlobalService } from '@models/global.service';
import { WebSocketService, DataChangedPayload } from '@services/websocket.service';
import { LiveSyncService } from '@models/live/live-sync.service';
import { Vacation } from '@models/vacation/vacation.model';

beforeAll(() => {
    NxStatic.global = { tables: [{ name: 'vacations', columns: [] }] } as unknown as GlobalService;
});

describe('LiveSyncService only refetches instances that opted in', () => {
    let dataChanged$: Subject<DataChangedPayload>;

    beforeEach(() => {
        vi.useFakeTimers();
        dataChanged$ = new Subject<DataChangedPayload>();
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            providers: [
                provideZonelessChangeDetection(),
                { provide: WebSocketService, useValue: { dataChanged$ } },
                { provide: GlobalService, useValue: { user: undefined } },
            ],
        });
        TestBed.inject(LiveSyncService);
    });

    afterEach(() => vi.useRealTimers());

    const touch = (id: string) => {
        dataChanged$.next({ class: 'Vacation', id, event: 'updated', actorId: '999' });
        vi.advanceTimersByTime(400);
    };

    it('does not refetch when no registered instance has liveSyncEnabled', () => {
        const v = Vacation.fromJson({ id: '1', class: 'Vacation', comment: 'old' });
        const get = vi.fn(() => of({ id: '1', class: 'Vacation', comment: 'new' }));
        v.httpService = { get } as unknown as Vacation['httpService'];

        touch('1');

        expect(get).not.toHaveBeenCalled();
        expect(v.comment).toBe('old');
    });

    it('refetches and applies in place once an instance opts in', () => {
        const v = Vacation.fromJson({ id: '2', class: 'Vacation', comment: 'old' });
        const get = vi.fn(() => of({ id: '2', class: 'Vacation', comment: 'new' }));
        v.httpService = { get } as unknown as Vacation['httpService'];
        v.liveSyncEnabled = true;

        touch('2');

        expect(get).toHaveBeenCalledTimes(1);
        expect(v.comment).toBe('new');
    });

    it('applies the same refetch to every registered instance sharing that id, opted in or not', () => {
        const detail = Vacation.fromJson({ id: '3', class: 'Vacation', comment: 'old' });
        const row = Vacation.fromJson({ id: '3', class: 'Vacation', comment: 'old' });
        const get = vi.fn(() => of({ id: '3', class: 'Vacation', comment: 'new' }));
        detail.httpService = { get } as unknown as Vacation['httpService'];
        detail.liveSyncEnabled = true;

        touch('3');

        expect(get).toHaveBeenCalledTimes(1);
        expect(detail.comment).toBe('new');
        expect(row.comment).toBe('new');
    });
});
