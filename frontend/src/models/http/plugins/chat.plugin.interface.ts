import { Observable } from 'rxjs';
import { IPlugin } from './plugin.instance';
import { User } from '@models/user/user.model';
import { Dictionary } from '@constants/constants';

export abstract class IChatPlugin extends IPlugin {
    IChatPluginProperty!: boolean;
    posts!: Dictionary[];
    index!: () => Observable<unknown>;
    send!: (message: string) => Observable<unknown>;
    link!: () => string;
    abstract getUser: (userId: string) => User | undefined;
}
