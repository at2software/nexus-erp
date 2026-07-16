import { Dictionary } from '@constants/constants';
export const objectMap = <T, U>(obj: Dictionary<T>, fn: (input: T, key: string, i: number) => U): Record<string, U> =>
	Object.fromEntries(Object.entries(obj).map(([k, v], i) => [k, fn(v, k, i)])) as Dictionary<U>;
// filters key-value-objects and removes all keys that are either null/undefined or empty arrays
export const objectRemoveEmpty = <T>(obj: Dictionary<T>) => Object.fromEntries(Object.entries(obj).filter(([, v]) => [v].flat().length > 0 && v != null));
