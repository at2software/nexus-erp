import { forkJoin, Observable } from 'rxjs';
import { PluginInstance } from './plugin.instance';
import { IChatPlugin } from './chat.plugin.interface';
import { User } from '../user/user.model';
import { Dictionary } from '@constants/constants';

export abstract class ChatPluginInstance extends PluginInstance implements IChatPlugin {
    IChatPluginProperty!: boolean;
     
    posts!: any[];
    users: Dictionary<User> = {};
    channelName!: string;
    channelId!: string;
    newPluginText: string = 'Channel ID:';

    index!: () => Observable<unknown>;
    indexMembers!: () => Observable<unknown>;
    showImage!: (userId: string) => Observable<unknown>;
    showChannel!: () => Observable<unknown>;
    send!: (message: string) => Observable<unknown>;
    link!: () => string;
    getRootInstance = (): ChatPluginInstance => (this.baseInstance as ChatPluginInstance) ?? this;
    getUser = (userId: string): User | undefined => (userId in this.getRootInstance().users ? this.getRootInstance().users[userId] : undefined);
    getUsers = (): User[] => Object.values(this.getRootInstance().users);
    abstract setChannelName: (data: unknown) => void;

    getHref = () => this._baseUrl;
    getName = () => this.channelName;

    protected connectSub = (): Promise<void> =>
        new Promise<void>((resolve) => {
            const parts = this._baseUrl.split('/');
            this.channelId = parts.pop() as string;
            const subs = [this.indexMembers(), this.showChannel()];
            forkJoin(subs).subscribe((data) => {
                this.setChannelName(data[1]);
                resolve();
            });
        });
    protected addMember(data: Dictionary) {
        // root function only
        if (this.baseInstance) return console.error('cannot call addMember on non-root instance');
        if ((data['user_id'] as string) in this.users) return;
        this.users[data['user_id'] as string] = this.toUser(data);
        // Don't fetch base64 images from chat service - use resolved user icons from VcardClass instead
    }
    protected findMember = (id: string) => (id in this.getRootInstance().users ? this.getRootInstance().users[id] : undefined);
    protected toUser = (_: Dictionary): User => {
        const user = User.fromJson({
            id: _['user_id'] || _['id'],
            name: _['username'] || _['nickname'] || ((_['first_name'] as string ?? '') + ' ' + (_['last_name'] as string ?? '')).trim() || 'Unknown',
        });
        user.var.data = _;
        user.var.username = _['username'];
        user.var.email = _['email'];
        user.icon = user.var.base64Image;
        return user;
    };
}
