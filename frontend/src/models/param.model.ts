import { ParamService } from "src/models/param.service"
import { Serializable } from "./serializable"

interface I18nVariant { language: string; formality: string; text: string };

export class Param extends Serializable {

	SERVICE = ParamService

    key         : string
    value?      : string | I18nVariant[]
    fallback    : boolean = false
    type        : number = 2
    parent_path?: string
    id          : string = ''

	static API_PATH = ():string => 'params'
	static ADDITIONAL_COLUMNS = ():string[] => ['value']

    getApiPath = () => (this.parent_path ? this.parent_path + '/' : '') + 'params/' + this.key;
    getApiPathWithId = () => `${this.getApiPath()}`;

}