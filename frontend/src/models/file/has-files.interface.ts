import { Serializable } from '@models/_core/serializable';
import { File } from './file.model';

export interface IHasFiles extends Serializable {
    files: File[]; // ProxyArray
}
