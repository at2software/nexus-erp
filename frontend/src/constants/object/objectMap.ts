import { Dictionary } from '@constants/constants';
export const objectMap = <T, U>(obj: Dictionary<T>, fn: (input: T, key: string, i: number) => U): Record<string, U> =>
	Object.fromEntries(Object.entries(obj).map(([k, v], i) => [k, fn(v, k, i)])) as Dictionary<U>;
export const objectRemoveEmpty = <T>(obj: Dictionary<T>) => Object.fromEntries(Object.entries(obj).filter(([, v]) => [v].flat().length > 0 && v != null));
