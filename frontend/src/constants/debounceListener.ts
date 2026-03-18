import { debounceTime, distinctUntilChanged, fromEvent, map, ObservableInput, takeUntil } from "rxjs";
import { HasEventTargetAddRemove } from "rxjs/internal/observable/fromEvent";

export const debounceListener = (
    destroy$:ObservableInput<any>, 
    target: HasEventTargetAddRemove<unknown> | ArrayLike<HasEventTargetAddRemove<unknown>>, 
    eventName: string,
    appliedMap = (_:any) => window.scrollY > 0) => fromEvent(target, eventName)
    .pipe(
        debounceTime(50),
        map(_ => appliedMap(_)),
        distinctUntilChanged(),
        takeUntil(destroy$)
    )