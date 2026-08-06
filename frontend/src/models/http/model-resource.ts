import { ResourceRef } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';

export function modelResource<T>(stream: () => Observable<T>): ResourceRef<T | undefined>;
export function modelResource<T, P>(params: () => P, stream: (params: NoInfer<Exclude<P, undefined>>) => Observable<T>): ResourceRef<T | undefined>;
export function modelResource<T, P>(first: () => P | Observable<T>, second?: (params: Exclude<P, undefined>) => Observable<T>): ResourceRef<T | undefined> {
    if (!second) return rxResource<T, void>({ stream: () => (first as () => Observable<T>)() });
    return rxResource<T, P>({ params: first as () => P, stream: ({ params }) => second(params) });
}

export function modelListResource<T>(stream: () => Observable<T[]>): ResourceRef<T[]>;
export function modelListResource<T, P>(params: () => P, stream: (params: NoInfer<Exclude<P, undefined>>) => Observable<T[]>): ResourceRef<T[]>;
export function modelListResource<T, P>(first: () => P | Observable<T[]>, second?: (params: Exclude<P, undefined>) => Observable<T[]>): ResourceRef<T[]> {
    if (!second) return rxResource<T[], void>({ stream: () => (first as () => Observable<T[]>)(), defaultValue: [] });
    return rxResource<T[], P>({ params: first as () => P, stream: ({ params }) => second(params), defaultValue: [] });
}
