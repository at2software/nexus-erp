import { dayjs, Dayjs } from '@constants/date/dates';

export enum RequestType {
    GET,
    POST,
    PUT,
    DELETE,
    OPTIONS,
}

export type Dictionary<T = unknown> = Record<string, T>;

export const filtered = <T extends Dictionary>(o: T): Partial<T> => {
    const n: Partial<T> = {};
    for (const k in o) {
        const value = o[k];
        if (value !== undefined) n[k] = value;
    }
    return n;
};
export const span = (o?: StartEnd): string | undefined => (o?.startDate?.format ? o.startDate.format('DD.MM.YYYY') + ',' + o.endDate!.format('DD.MM.YYYY') : undefined);

export class StartEnd {
    startDate: Dayjs | null = null;
    endDate: Dayjs | null = null;
    toString = () => (this.startDate?.format && this.endDate?.format ? { startDate: this.startDate, endDate: this.endDate } : undefined);

    constructor(_: { startDate?: Dayjs | string | null; endDate?: Dayjs | string | null } | undefined = undefined) {
        if (_) {
            this.startDate = typeof _.startDate != 'string' ? (_.startDate ?? null) : dayjs(_.startDate);
            this.endDate = typeof _.endDate != 'string' ? (_.endDate ?? null) : dayjs(_.endDate);
        }
    }
    static forceObject = (_: StartEnd | { startDate?: Dayjs | string | null; endDate?: Dayjs | string | null } | undefined) => {
        if (_ instanceof StartEnd) {
            return _;
        }
        if (_ && _.startDate && _.endDate) {
            return new StartEnd(_);
        }
        return undefined;
    };
}

export const indexed = <T extends Dictionary>(a: T[], key: keyof T & string): Dictionary =>
    a.reduce<Dictionary>((acc, x) => {
        acc[String(x[key])] = x;
        return acc;
    }, {});
/**
 * @param a The array to be converted
 * @param keyColumn name of the param to be used as key
 * @param nameColumn name of the param to be used as name
 * @returns
 */
export const typeahead = <T extends Dictionary>(a: T[], keyColumn: keyof T & string, nameColumn: keyof T & string): { key: string; name: string }[] =>
    a
        .map((x) => ({ key: String(x[keyColumn] ?? ''), name: String(x[nameColumn] ?? '') }))
        .filter((v, index, self) => index === self.findIndex((y) => y.key === v.key));

export { REFLECTION } from './model/reflection';
