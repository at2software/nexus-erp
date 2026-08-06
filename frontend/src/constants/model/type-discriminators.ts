import { Discriminated, SubType } from '@models/_core/hydrate';

type ModelConstructor = new (...args: unknown[]) => unknown;

const modelRegistry = new Map<string, ModelConstructor>();

export const Model = (name: string) => (target: ModelConstructor, _context?: ClassDecoratorContext) => void modelRegistry.set(name, target);

type ClassRef = ModelConstructor;
type ClassThunk = () => ClassRef;

/**
 * A relation whose concrete model is decided by the payload's `class` field:
 *
 *   TypeFromClass()                  any registered model
 *   TypeFromClass(SuperClass)        registered subclasses of SuperClass
 *   TypeFromClass(() => A, () => B)  exactly these
 *
 * Candidates resolve lazily, because the registry is still filling while these run.
 */
export function TypeFromClass(): ReturnType<typeof Discriminated>;
export function TypeFromClass(superClass: ClassRef): ReturnType<typeof Discriminated>;
export function TypeFromClass(...thunks: ClassThunk[]): ReturnType<typeof Discriminated>;
export function TypeFromClass(...args: (ClassRef | ClassThunk)[]) {
    const [first] = args;
    const isThunkMode = args.length === 0 || (first as { prototype?: unknown }).prototype === undefined;
    let resolved: SubType[] | null = null;

    const resolve = (): SubType[] => {
        if (args.length === 0) return [...modelRegistry].map(([name, value]) => ({ name, value: value as unknown as new () => object }));
        if (isThunkMode) {
            return args.map((thunk) => {
                const cls = (thunk as ClassThunk)();
                const name = [...modelRegistry].find(([, v]) => v === cls)?.[0];
                if (!name) throw new Error(`${cls.name} must be decorated with @Model`);
                return { name, value: cls as unknown as new () => object };
            });
        }
        return [...modelRegistry]
            .filter(([, v]) => v.prototype instanceof (first as ClassRef))
            .map(([name, value]) => ({ name, value: value as unknown as new () => object }));
    };

    const fallback = () => (args.length === 0 ? Object : isThunkMode ? (first as ClassThunk)() : first) as unknown as new () => object;

    return Discriminated(() => (resolved ??= resolve()), fallback);
}
