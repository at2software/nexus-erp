import { Serializable } from "../serializable";
import { File } from "./file.model";

export interface IHasFiles extends Serializable {
    files : File[] // ProxyArray
}