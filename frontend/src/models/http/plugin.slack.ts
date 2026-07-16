import { Dictionary } from '@constants/constants';
import { catchError, map, Observable } from 'rxjs';
import { dayjs } from '@constants/dates';
import { PluginLink } from '../pluginLink/plugin-link.model';
import { ChatPluginInstance } from './chat.plugin.instance';

interface SlackPost extends Dictionary { ts?: string; text?: string; user?: string; }
interface SlackHistoryResponse extends Dictionary { messages?: SlackPost[]; }

export class SlackPlugin extends ChatPluginInstance {
    posts: SlackPost[] = [];
    channelName: string = 'slack';

    // VCard integration metadata (not implemented for Slack yet)
    getVcardAttributeName = () => 'X-NEXUS-SLACK';
    isUserInInstance = (): boolean => false;
    getProfileUrl = (): string => '';
    getUserSelectionModalPath = () => '';
    getInterfacePropertyName = () => 'IChatPluginProperty';
    getPluginTypeName = () => 'slack';

    icon = () => 'slack';
    link = () => {
        if (!this.enc) return '';
        return this._baseUrl.substring(0, this.enc.value.url.length);
    };
    getRootInstance = (): SlackPlugin => (this.baseInstance as SlackPlugin) ?? this;

    baseUrl = (): string => this._baseUrl.substring(0, this.enc.value.url.length) + 'api';

    toPluginLink = (id: string) => PluginLink.fromJson({ type: 'slack', url: this.enc.value.url + 'archives/' + id });
    index = () => this.get(`/conversations.history?channel=${this.channelId}&latest=${dayjs().unix()}`, {}, this.#toPost);
    indexMembers = () => this.get(`/conversations.members?channel=${this.channelId}`, {}, (_: unknown) => this.getRootInstance().addMember(_ as Dictionary<unknown>));
    showImage = (userId: string) => this.getRootInstance().getBlob(`users.profile.get?user=${userId}`);
    showChannel = () => this.get('/conversations.info', { channel: this.channelId });
    setChannelName = (data: unknown) => (this.channelName = (data as { name?: string })?.name ?? '');
    send = (message: string) => this.getRootInstance().post(`chat.postMessage`, { channel: this.channelId, text: message });

    // Get activity for comments tab
    getActivityComments(): Observable<Dictionary[]> {
        return (this.index() as Observable<SlackPost[]>).pipe(
            map((posts) => {
                if (!posts) return [];
                return posts.map((post) => ({
                    text: `<n>slack</n> ${post.text || ''}`,
                    created_at: new Date(parseInt(post.ts ?? '0') * 1000),
                    user: { name: post.user || 'Unknown' },
                    is_mini: true,
                    var: { source: 'slack', nicon: 'slack' },
                }));
            }),
        );
    }

    protected connect = () =>
        new Promise<void>((resolve, reject) => {
            this.getRootInstance()
                .get('auth.test')
                .pipe(catchError(() => this.handleError(reject)))
                .subscribe(() => resolve());
        });

    #toPost = (data: unknown): SlackPost[] => {
        const d = data as SlackHistoryResponse;
        let m: SlackPost[] = d.messages || [];
        m.forEach((post) => {
            (post as SlackPost & { avatar?: () => string | undefined }).avatar = () => {
                const member = this.findMember(post.user ?? '');
                return member?.icon;
            };
        });
        m = m.sort((a, b) => Number(a.ts ?? 0) - Number(b.ts ?? 0));
        return m;
    };
}
