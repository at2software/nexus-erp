
const AFTER_DESERIALIZE_KEY = Symbol('afterDeserialize');

export function AfterDeserialize(): MethodDecorator {
    return (target, propertyKey) => {
        const own: string[] = Reflect.getOwnMetadata(AFTER_DESERIALIZE_KEY, target) ?? [];
        own.push(propertyKey as string);
        Reflect.defineMetadata(AFTER_DESERIALIZE_KEY, own, target);
    };
}

export function getAfterDeserializeMethods(proto: object): string[] {
    const chain: string[][] = [];
    let current: object | null = proto;
    while (current && current !== Object.prototype) {
        const own: string[] | undefined = Reflect.getOwnMetadata(AFTER_DESERIALIZE_KEY, current);
        if (own) chain.unshift(own);
        current = Object.getPrototypeOf(current);
    }
    return chain.flat();
}
