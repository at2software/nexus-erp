import { OperatorFunction, map } from 'rxjs';
import { Serializable } from '@models/serializable';
import { Dictionary } from './constants';

const toSnakeCase = (str: string) => str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

type VarMappedResponse = Dictionary & {
    _varMappings?: Dictionary<string[]>;
};

/**
 * Defines which fields should be mapped to .var during serialization.
 * Must be called BEFORE serialize() in the pipe.
 */
export const mapVar = <T extends VarMappedResponse>(fields: string[], subKey?: string): OperatorFunction<T, T> =>
    map((data) => {
        data._varMappings = data._varMappings || {};
        data._varMappings[subKey || '_self'] = fields;
        return data;
    });

/**
 * Serializes an array from API response using a Serializable class.
 * Converts snake_case API key to camelCase, maps items through Model.fromJson(),
 * applies any var mappings defined by mapVar().
 */
export const serialize = <T extends Serializable, TResponse extends VarMappedResponse>(
    key: string,
    Model: (new () => T) & { fromJson(json: Dictionary): T },
): OperatorFunction<TResponse, TResponse & Dictionary<T[]>> =>
    map((data) => {
        const snakeKey = toSnakeCase(key);
        const rawItems = (data[snakeKey] ?? data[key] ?? []) as Dictionary[];
        const varFields = data._varMappings?.[key] || [];

        const serializedItems = rawItems.map((raw) => {
            const item = Model.fromJson(raw);
            varFields.forEach((field) => {
                if (raw[field] !== undefined) {
                    item.var[field] = raw[field];
                }
            });
            return item;
        });
        return Object.assign(data, { [key]: serializedItems });
    });

/**
 * Extracts a specific key from the data object.
 * @param key - Key to extract (supports both camelCase and snake_case)
 */
export const pluck = <T = unknown>(key: string): OperatorFunction<Dictionary, T | []> =>
    map((data) => {
        const snakeKey = toSnakeCase(key);
        return (data[key] ?? data[snakeKey] ?? []) as T | [];
    });
