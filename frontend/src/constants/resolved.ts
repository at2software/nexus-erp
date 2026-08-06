export const resolved = <T>(_: T | (() => T)): T => (typeof _ === 'function' ? (_ as () => T)() : _);
