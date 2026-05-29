import 'reflect-metadata';

const AFTER_DESERIALIZE_KEY = Symbol('afterDeserialize');

/**
 * Marks a method to be called automatically after deserialization (plainToInstance).
 * Methods are called in class hierarchy order (parent → child).
 *
 * Usage:
 * ```ts
 * @AfterDeserialize()
 * computeIcon() {
 *     this.icon = `companies/${this.company_id}/icon`;
 * }
 * ```
 */
export function AfterDeserialize(): MethodDecorator {
    return (target, propertyKey) => {
        const own: string[] = Reflect.getOwnMetadata(AFTER_DESERIALIZE_KEY, target) ?? [];
        own.push(propertyKey as string);
        Reflect.defineMetadata(AFTER_DESERIALIZE_KEY, own, target);
    };
}

/**
 * Collects all @AfterDeserialize methods walking up the prototype chain (parent-first).
 */
export function getAfterDeserializeMethods(proto: any): string[] {
    const chain: string[][] = [];
    let current = proto;
    while (current && current !== Object.prototype) {
        const own: string[] | undefined = Reflect.getOwnMetadata(AFTER_DESERIALIZE_KEY, current);
        if (own) chain.unshift(own);
        current = Object.getPrototypeOf(current);
    }
    return chain.flat();
}
