import { map, Observable } from 'rxjs';
import { Toast } from '@app/_shards/toast/toast';
import type { Dictionary } from '@constants/constants';
import { nx, TBroadcast } from '@models/_core/nx-bridge';
import type { Serializable } from '@models/_core/serializable';

export const store = <T extends Serializable>(self: T, changes?: Dictionary, silent = false): Observable<T> =>
    self.httpService.post(self.apiPath(), changes ?? self.toPayload()).pipe(
        map((x) => {
            if (x && typeof x === 'object') self.fromJson(x as Dictionary);
            if (x !== undefined && !silent) Toast.success('Successfully created');
            return self;
        }),
    );

export const refresh = <T extends Serializable>(self: T): Observable<T> =>
    self.httpService.get(self.apiPathWithId()).pipe(
        map((x) => {
            if (x && typeof x === 'object') self.fromJson(x as Dictionary);
            return self;
        }),
    );

export const update = <T extends Serializable>(self: T, changes?: Dictionary, silent = false): Observable<T> =>
    self.httpService.put(self.apiPathWithId(), changes ?? self.dirtyFields()).pipe(
        map((x) => {
            if (typeof x === 'object') self.fromJson(x as Dictionary);
            if (x && !silent) Toast.success('Successfully updated');
            return self;
        }),
    );

export const remove = <T extends Serializable>(self: T): Observable<T> =>
    self.httpService.delete(self.apiPathWithId()).pipe(
        map((x) => {
            if (x) {
                Toast.success('Successfully deleted');
                nx().broadcast({ type: TBroadcast.Delete, data: self });
            }
            return self;
        }),
    );
