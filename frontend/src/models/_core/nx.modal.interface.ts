export interface INxModal<T = unknown> {
    init(...args: unknown[]): void;
    onSuccess(): T;
}
