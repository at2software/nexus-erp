import { catchError, map, Observable } from "rxjs";
import moment from "moment";
import { PluginLink } from "../pluginLink/plugin-link.model";
import { ChatPluginInstance } from "./chat.plugin.instance";

export class SlackPlugin extends ChatPluginInstance {
    
    posts: any[] = []
    channelName:string = 'slack'
    
    // VCard integration metadata (not implemented for Slack yet)
    getVcardAttributeName = () => 'X-NEXUS-SLACK'
    isUserInInstance = (): boolean => false
    getProfileUrl = (): string => ''
    getUserSelectionModalPath = () => ''
    getInterfacePropertyName = () => 'IChatPluginProperty'
    getPluginTypeName = () => 'slack'

    icon = () => 'slack'
    link = () => {
        if (!this.enc) return ''
        return this._baseUrl.substring(0, this.enc.value.url.length)
    }
    getRootInstance = ():SlackPlugin => this.baseInstance as SlackPlugin ?? this

    baseUrl = (): string => this._baseUrl.substring(0, this.enc.value.url.length) + 'api'

    toPluginLink = (id:string) => PluginLink.fromJson({ type: 'slack', 'url': this.enc.value.url + 'archives/' + id})
    index = () => this.get(`/conversations.history?channel=${this.channelId}&latest=${moment().unix()}`, {}, this.#toPost);
    indexMembers = () => this.get(`/conversations.members?channel=${this.channelId}`, {}, (_: any) => this.getRootInstance().addMember(_));
    showImage = (userId:string) => this.getRootInstance().getBlob(`users.profile.get?user=${userId}`);
    showChannel = () => this.get('/conversations.info', { channel: this.channelId });
    setChannelName = (data: any) => this.channelName = data.name
    send = (message:string) => this.getRootInstance().post(`chat.postMessage`, { channel: this.channelId, text: message });

    // Get activity for comments tab
    getActivityComments(): Observable<any[]> {
        return this.index().pipe(
            map((posts: any[]) => {
                if (!posts) return []
                return posts.map(post => ({
                    text: `<n>slack</n> ${post.text || ''}`,
                    created_at: new Date(parseInt(post.ts) * 1000),
                    user: { name: post.user || 'Unknown' },
                    is_mini: true,
                    var: { source: 'slack', nicon: 'slack' }
                }))
            })
        )
    }
    
    protected connect = () => new Promise<void>((resolve, reject) => {
        this.getRootInstance().get('auth.test')
        .pipe(catchError(() => this.handleError(reject)))
        .subscribe(resolve)
    })

    #toPost = (data: any): object => {
        let m: any[] = data.messages || [];
        m.forEach((post: any) => {
            post.avatar = () => {
                const member = this.findMember(post.user);
                return member?.icon;
            };
        });
        m = m.sort((a, b) => a.ts - b.ts);
        return m;
    };

}
