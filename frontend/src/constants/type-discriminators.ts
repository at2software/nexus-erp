import { Type } from 'class-transformer';

type ModelConstructor = new(...args: unknown[]) => unknown;

const modelRegistry = new Map<string, ModelConstructor>();

export const Model = (name: string) => (target: ModelConstructor) => void modelRegistry.set(name, target);

type ClassRef = ModelConstructor;
type ClassThunk = () => ClassRef;

export function TypeFromClass(): PropertyDecorator;
export function TypeFromClass(superClass: ClassRef): PropertyDecorator;
export function TypeFromClass(...thunks: ClassThunk[]): PropertyDecorator;
export function TypeFromClass(...args: (ClassRef | ClassThunk)[]) {
    const [first] = args;
    const isThunkMode = args.length === 0 || (first as { prototype?: unknown }).prototype === undefined;
    let resolved: { name: string, value: ModelConstructor }[] | null = null;
    const resolve = () => {
        if (args.length === 0)
            return [...modelRegistry].map(([k, v]) => ({ name: k, value: v }));
        if (isThunkMode)
            return args.map(thunk => {
                const cls = (thunk as ClassThunk)();
                const name = [...modelRegistry].find(([_, v]) => v === cls)?.[0];
                if (!name) throw new Error(`${cls.name} must be decorated with @Model`);
                return { name, value: cls };
            });
        return [...modelRegistry]
            .filter(([_, v]) => v.prototype instanceof (first as ClassRef))
            .map(([k, v]) => ({ name: k, value: v }));
    };
    const discriminator = {
        property: 'class' as const,
        get subTypes() { return resolved ??= resolve(); }
    };
    return Type(() => (args.length === 0 ? Object : isThunkMode ? (first as ClassThunk)() : first) as ClassRef, {
        discriminator: discriminator as {
            property: 'class';
            subTypes: { name: string; value: ModelConstructor }[];
        },
        keepDiscriminatorProperty: true
    });
}
