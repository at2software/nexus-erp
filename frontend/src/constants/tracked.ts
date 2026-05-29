import { computed, Signal } from '@angular/core'

/**
 * Wraps a signal source so the returned signal also fires whenever the
 * underlying Serializable instance bumps (after _serialize/mergeArrayInto/delete).
 *
 * Pattern:
 *   readonly #projectIn = input.required<Project>({ alias: 'project' })
 *   readonly project    = tracked(this.#projectIn)
 *
 * Use the tracked one (`this.project()`) in templates/computed so OnPush
 * refreshes on inner mutations. Use the raw `#projectIn()` inside effects
 * that should fire ONLY on input reference changes (avoids feedback loops
 * when the effect causes the instance to mutate).
 */
export const tracked = <T>(source: Signal<T>): Signal<T> =>
    computed(
        () => {
            const value = source()
            ;(value as any)?.snapshot?.()
            return value
        },
        { equal: () => false },
    )
