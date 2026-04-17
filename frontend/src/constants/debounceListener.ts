import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, fromEvent, map } from "rxjs";
import { HasEventTargetAddRemove } from "rxjs/internal/observable/fromEvent";

export const debounceListener = (
    destroyRef: DestroyRef,
    target: HasEventTargetAddRemove<unknown> | ArrayLike<HasEventTargetAddRemove<unknown>>,
    eventName: string,
    appliedMap = (_: any) => window.scrollY > 0) => fromEvent(target, eventName)
    .pipe(
        debounceTime(50),
        map(_ => appliedMap(_)),
        distinctUntilChanged(),
        takeUntilDestroyed(destroyRef)
    )
