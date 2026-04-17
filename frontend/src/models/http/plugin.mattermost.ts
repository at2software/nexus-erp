import { catchError, forkJoin, map, Observable, of, switchMap } from "rxjs";
import { User } from "../user/user.model";
import { PluginLink } from "../pluginLink/plugin-link.model";
import { ChatPluginInstance } from "./chat.plugin.instance";
import { NxGlobal } from "@app/nx/nx.global";
import { Project } from "@models/project/project.model";
import { Assignee } from "@models/assignee/assignee.model";
import { markdown2html, shortcodeToEmoji } from "@app/_activity/tab-mattermost/mattermost.constants";

export class MattermostPlugin extends ChatPluginInstance {
    posts: any[] = []
    channelName:string = 'mattermost'
    teamId:string

    icon = () => 'mattermost'
    link = () => {
        if (!this.enc) return ''
        return this._baseUrl.substring(0, this.enc.value.url.length) + this.enc.value.team + '/' + this._baseUrl.substring(this.enc.value.url.length + this.enc.value.team.length + 1)
    }
    getRootInstance = ():MattermostPlugin => this.baseInstance as MattermostPlugin ?? this
    
    // VCard integration metadata
    getVcardAttributeName = () => 'X-NEXUS-MATTERMOST'
    isUserInInstance = (userId: string): boolean => userId in this.getRootInstance().users
    getProfileUrl = (): string => {
        const mattermostUrl = this.enc.value.url.replace(/\/$/, '')
        const teamName = this.enc.value.team
        return `${mattermostUrl}/${teamName}`
    }
    getUserSelectionModalPath = () => '../../app/_modals/mattermost-user-selection/mattermost-user-selection.component'
    getInterfacePropertyName = () => 'IChatPluginProperty'
    getPluginTypeName = () => 'mattermost'

    baseUrl = (): string => this._baseUrl.substring(0, this.enc.value.url.length) + 'api/v4/' + this._baseUrl.substring(this.enc.value.url.length + this.enc.value.team.length + 1)

    toPluginLink = (id:string) => PluginLink.fromJson({ type: 'mattermost', 'url': this.enc.value.url + this.enc.value.team + '/channels/' + id})

    addAssigneesToChannel = (assignees:Assignee[], channelId:string) => {
        this.addUsersToChannel(assignees.filter(assignee => assignee.assignee.is('User')).map(_ => _.assignee as User), channelId)
    }
    addUsersToChannel = (users:User[], channelId:string) => users.forEach(user => this.addUserToChannel(user, channelId))
    addUserToChannel(user:User, channelId:string) {
        const globUser = NxGlobal.global.userFor(user.id)
        globUser?.encryptions.filter(_ => _.key === 'mattermost' && _.my_id?.length).forEach(_ => this.addUserIdToChannel(_.my_id!, channelId).subscribe())
    }
    addUserIdToChannel = (userId:string, channelId:string) => this.post(`channels/${channelId}/members`, { user_id: userId })
    getChannelId = (name:string) => this.get(`teams/${this.teamId}/channels/name/${name}`)
    getTeamId = () => this.get('teams/name/' + this.enc.value.team)
    index = () => this.get(`/posts?per_page=60`, {}, this.#toPost)
    indexMembers = () => this.get(`/members?per_page=999`, {}, (_:any) => this.getRootInstance().addMember(_))
    indexTeamUsers = () => {
        // Only fetch team users on root instance
        if (this.baseInstance) {
            console.warn('indexTeamUsers should only be called on root instance')
            return of([])
        }
        // Fetch all users in the team (for root instance)
        return this.get(`teams/${this.teamId}/members?per_page=200`).pipe(
            switchMap((members: any[]) => {
                if (!members || members.length === 0) return of([])
                
                // Use batch endpoint to fetch all user details in one request
                const userIds = members.map(m => m.user_id)
                return this.post(`users/ids`, userIds).pipe(catchError(() => of([])))
            }),
            map((users: any[]) => {
                users.filter(u => u).forEach(u => this.addMember({ user_id: u.id, ...u }))
                return users.filter(u => u)
            })
        )
    }
    showImage = (userId:string) => this.getRootInstance().getBlob(`users/${userId}/image`)
    setChannelName = (data: any) => this.channelName = data.display_name
    showChannel = () => this.get('')
    send = (message:string) => this.getRootInstance().post(`posts`, { channel_id: this.channelId, message: message})

    createBlankFor = (project:Project) => new Promise<string>((resolve) => {
        const channelName = 'nexus_project_' + project.id
        this.getChannelId(channelName).pipe(catchError(() => {
            this.post('channels', {
                team_id     : this.teamId,
                name        : channelName,
                display_name: project.name,
                type        : 'O'
            }).subscribe(response => {
                const channelId = response.id
                this.addAssigneesToChannel(project.getAssignedUsers(), channelId)
                resolve(channelId)
            })
            return of()
        })).subscribe(existingResponse => {
            const channelId = existingResponse.id
            this.addAssigneesToChannel(project.assignees, channelId)
            resolve(channelId)
        })
    })

    // Get activity for comments tab
    getActivityComments(_projectId: string = '', _maxInitialItems: number = 150, resolveUser?: (email?: string, username?: string, name?: string, pluginAttribute?: string) => any): Observable<any[]> {
        return this.index().pipe(
            switchMap((posts: any[]) => {
                if (!posts) return of([])
                const commentDataList = posts
                    .filter(post => {
                        // Filter out bot messages and git/issue event posts
                        const isBot = post.props?.from_bot === 'true' || post.props?.from_webhook === 'true'
                        const isGitEvent = post.message?.includes('pushed') || post.message?.includes('opened an issue') || post.message?.includes('closed an issue')
                        return !isBot && !isGitEvent
                    })
                    .map(post => {
                        const authorName = post.username || 'Unknown'
                        const userId = post.user_id

                        // Check if this is a system/ephemeral message
                        const isSystemMessage = post.type === 'system_ephemeral' ||
                                              post.type === 'system_add_to_channel' ||
                                              post.type === 'system_remove_from_channel' ||
                                              post.type?.startsWith('system_')

                        // Don't use member - it's just a user object created from Mattermost data
                        // Only use resolvedUser which properly looks up NEXUS users by X-NEXUS-MATTERMOST attribute
                        const resolvedUser = resolveUser?.(undefined, userId, authorName, 'X-NEXUS-MATTERMOST')

                        // If user is not resolved, try to get their display name from Mattermost API
                        let displayName = authorName
                        if (!resolvedUser) {
                            const member = this.getUser(userId)
                            if (member?.name && member.name !== 'Unknown') {
                                displayName = member.name
                            }
                        }

                        // Aggregate reactions by emoji name
                        const reactionsRaw: any[] = post.metadata?.reactions || []
                        const reactionMap = new Map<string, number>()
                        reactionsRaw.forEach(r => reactionMap.set(r.emoji_name, (reactionMap.get(r.emoji_name) ?? 0) + 1))
                        const reactions = Array.from(reactionMap.entries())
                            .map(([name, count]) => ({ emoji: shortcodeToEmoji(name) || `:${name}:`, count }))

                        // Extract file attachments from post metadata
                        const attachments = (post.metadata?.files || []).map((f: any) => ({
                            id: f.id,
                            name: f.name,
                            mimeType: f.mime_type || '',
                            isImage: (f.mime_type || '').startsWith('image/'),
                            size: f.size || 0,
                        }))

                        // Convert markdown to HTML
                        const messageHtml = markdown2html(post.message || '')

                        const commentData: any = {
                            text: messageHtml,
                            created_at: new Date(post.create_at),
                            user: resolvedUser || { name: displayName },
                            user_id: resolvedUser?.id,
                            is_mini: isSystemMessage,
                            reactions: reactions.length ? reactions : undefined,
                            attachments: attachments.length ? attachments : undefined,
                            var: { source: 'MattermostPlugin', ...(resolvedUser ? {} : { nicon: 'mattermost' }) }
                        }

                        // Copy icon properties from resolvedUser if available
                        if (resolvedUser) {
                            if ((resolvedUser as any)._icon) commentData._icon = (resolvedUser as any)._icon
                            if ((resolvedUser as any).iconBaseUrl !== undefined) commentData.iconBaseUrl = (resolvedUser as any).iconBaseUrl
                        }
                        return commentData
                    })

                if (!commentDataList.length) return of([])

                // Pre-fetch blob URLs for all attachments
                return forkJoin(commentDataList.map(commentData => {
                    const allAttachments = commentData.attachments || []
                    if (!allAttachments.length) return of(commentData)
                    return forkJoin(
                        allAttachments.map((a: any) => {
                            const path = a.isImage ? `files/${a.id}/preview` : `files/${a.id}`
                            return this.getRootInstance().getBlob(path).pipe(
                                map((blob: any) => blob instanceof Blob ? URL.createObjectURL(blob) : blob),
                                catchError(() => of(null))
                            )
                        })
                    ).pipe(
                        map(urls => {
                            (urls as any[]).forEach((url, i) => { if (url) allAttachments[i].blobUrl = url })
                            return commentData
                        })
                    )
                }))
            })
        )
    }
    
    protected connect = () => new Promise<void>((resolve, reject) => {
        this.getTeamId()
            .pipe(catchError(() => this.handleError(reject)))
            .subscribe(response => {
                if (response && 'id' in response) {
                    this.teamId = response.id
                    // Fetch all team users for the modal
                    this.indexTeamUsers().subscribe(() => resolve(), reject)
                } else {
                    resolve()
                }
            })
    })

    #toPost = (data:any):object => {
        let m:any[] = Object.values(data.posts)
        m = m.sort((a,b) => b.create_at - a.create_at) // Newest first
        return m
    }

}
