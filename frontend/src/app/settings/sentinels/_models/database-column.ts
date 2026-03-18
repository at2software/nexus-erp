import { Dictionary } from "src/constants/constants"
import { DatabaseColumnType } from "./database-column.type"
import { ConditionType, CONDITION_TREE, TCondition } from "./condition-tree.const"
import { clone } from "src/constants/clone"

export class DatabaseColumn {
    field       : string
    type        : string
    null        : string
    key         : string
    default?    : string
    extra?      : string
    comp        : string
    value       : any
    constructor(o: any) {
        const n: Dictionary = {}
        for (const key of Object.keys(o)) n[key.toLowerCase()] = o[key]
        Object.assign(this, n)
    }
    fieldType():DatabaseColumnType {
        switch (this.type) {
            case 'timestamp':
            case 'date':
            case 'datetime': return 'DATE'
            case 'int':
            case 'int unsigned': 
            case 'tinyint': return 'NUMBER'
            case 'longtext': return 'STRING'
        }
        if (this.type.match(/^varchar/)) return 'STRING'
        if (this.type.match(/^double/)) return 'NUMBER'
        if (this.type.match(/^tinyint/)) return 'NUMBER'
        return 'UNSUPPORTED'
    }
    fieldColor():string {
        switch (this.fieldType()) {
            case 'DATE': return 'cyan'
            case 'NUMBER': return 'teal'
            case 'STRING': return 'green'
        }
        return 'black'
    }
    _startingCondition:TCondition
    startingCondition ():TCondition {
        if (!this._startingCondition && this.fieldType() in CONDITION_TREE) {
            this._startingCondition = clone(CONDITION_TREE)[this.fieldType()]
        }
        return this._startingCondition
    }
    next = (_:TCondition):TCondition|undefined => _.type === ConditionType.Select ? _.options![_.value] : _.next
    recurse = (_:TCondition|undefined):any[] => _ ? [{ type: ConditionType[_.type], value: _.value}, ...this.recurse(this.next(_))] : []
    recurseParse = (_:TCondition, stack:any[]) => {
        _.value = stack.shift().value
        const nxt = this.next(_)
        if (stack.length && nxt) { 
            this.recurseParse(nxt, stack) 
        } else if (!stack.length && !nxt) {
            // do nothing, finished successfully
        } else { 
            console.error('error importing stack from database', nxt) 
        }
    }
    colorPath = ():any => {
        const m = this.getPath()
        let ret = `<span class="sentinel-attribute">${m.field}</span> `
        const copy = clone(m.columns)
        let operator = copy.shift().value
        if (operator == 'is') operator = "="
        else if (operator == 'equal to') operator = "="
        else if (operator == 'less than') operator = "<"
        else if (operator == 'more than') operator = ">"
        ret += '<span class="flex-fill text-center">' + operator + '</span> '
        let comp = copy.map((_:any)=>_.value).join(' ')
        if (copy[0].value == 'current date') {
            if (copy[1].type == 'Now') {
                if (copy[1].value[0] == 0) {
                    comp = "Today"
                } else {
                    let t = copy[1].value[0]
                    let u = 'from now'
                    if (t < 0) { t = -t; u = 'ago' }
                    comp = `${t} ${copy[1].value[1]} ${u}`
                }
            }
        }
        ret += `<span class="sentinel-compare">${comp}</span> `
        return ret
    }
    stringPath = ():any => {
        const m = this.getPath()
        const ret = m.field + ' ' + m.columns.map((_:any)=>_.value).join(' ')
        return ret
    }
    getPath = ():any => ({ 'field': this.field, 'columns': this.recurse(this.startingCondition()) })
    parsePath (path:any[]) { 
        this.recurseParse(this.startingCondition(), path) 
    }
}