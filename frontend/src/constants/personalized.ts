import { Dictionary } from "./constants";

export const personalized = (text:string, personalizations:Dictionary = {}):string => {
    if (!text) return text
    Object.keys(personalizations).forEach((key:string) => {
        const val = personalizations[key]
        text = text.replace(`[${key}]`, val)        
    })
    return text
}