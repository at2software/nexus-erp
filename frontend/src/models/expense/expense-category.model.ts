import { NexusHttpService } from "src/models/http/http.nexus"
import { Serializable } from "./../serializable"
import { Color } from "src/constants/Color"

export class ExpenseCategory extends Serializable {

    static API_PATH = (): string => 'encryptions'
    SERVICE = NexusHttpService<any>

    name :string      = ''
    color:string|null = null

    serialize = () => {
        this.colorCss = Color.posToHex(parseInt(this.id))
    }
}