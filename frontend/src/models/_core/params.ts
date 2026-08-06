import type { Observable } from 'rxjs';
import type { Dictionary } from '@constants/constants';
import type { Serializable } from '@models/_core/serializable';

export const paramPath = (self: Serializable, key: string): string => `${self.apiPathWithId()}/params/${key}`;

export const show = (self: Serializable, key: string, data: Dictionary = {}): Observable<unknown> => self.httpService.get(paramPath(self, key), data);

export const write = (self: Serializable, key: string, changes: Dictionary): Observable<unknown> => self.httpService.put(paramPath(self, key), changes);

export const remove = (self: Serializable, key: string): Observable<unknown> => self.httpService.delete(paramPath(self, key));

export const read = <T = string | number>(self: Serializable, key: string, def: T | undefined = undefined): T | undefined =>
    self.params && key in self.params ? (self.params[key] as T) : def;
