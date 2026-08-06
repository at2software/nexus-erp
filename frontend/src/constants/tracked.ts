import { computed, Signal } from '@angular/core'

export const tracked = <T>(source: Signal<T>): Signal<T> =>
    computed(
        () => {
            const value = source()
            ;(value as any)?.snapshot?.()
            return value
        },
        { equal: () => false },
    )
