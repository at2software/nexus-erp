import { map } from 'rxjs'
import { Serializable } from '@models/serializable'

const toSnakeCase = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)

/**
 * Defines which fields should be mapped to .var during serialization.
 * Must be called BEFORE serialize() in the pipe.
 */
export const mapVar = (fields: string[], subKey?: string) =>
    map((data: any) => {
        data._varMappings = data._varMappings || {}
        data._varMappings[subKey || '_self'] = fields
        return data
    })

/**
 * Serializes an array from API response using a Serializable class.
 * Converts snake_case API key to camelCase, maps items through Model.fromJson(),
 * applies any var mappings defined by mapVar().
 */
export const serialize = <T extends Serializable>(key: string, Model: new () => T) =>
    map((data: any) => {
        const snakeKey = toSnakeCase(key)
        const rawItems = data[snakeKey] || data[key] || []
        const varFields = data._varMappings?.[key] || []

        data[key] = rawItems.map((raw: any) => {
            const item = (Model as any).fromJson(raw) as T
            varFields.forEach((field: string) => {
                if (raw[field] !== undefined) {
                    item.var[field] = raw[field]
                }
            })
            return item
        })
        return data
    })

/**
 * Extracts a specific key from the data object.
 * @param key - Key to extract (supports both camelCase and snake_case)
 */
export const pluck = (key: string) => map((data: any) => {
    const snakeKey = toSnakeCase(key)
    return data[key] ?? data[snakeKey] ?? []
})
