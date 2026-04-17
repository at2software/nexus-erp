import { Company } from 'src/models/company/company.model';
import { CommentService } from '@models/comment/comment.service';
import { Component, DestroyRef, ElementRef, effect, inject, input, model, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Comment } from 'src/models/comment/comment.model';
import { Project } from 'src/models/project/project.model';
import { User } from 'src/models/user/user.model';
import { TabCommentComponent } from './tab-comment.component';
import { NexusModule } from '@app/nx/nexus.module';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { GitService } from '@models/git.service';
import { GlobalService } from '@models/global.service';
import { NgbTooltipModule, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';

import { PluginInstanceFactory } from '@models/http/plugin.instance.factory';
import { ChatPluginInstance } from '@models/http/chat.plugin.instance';


@Component({
    selector: 'app-tab-comments',
    templateUrl: './tab-comments.component.html',
    styleUrls: ['./tab-comments.component.scss'],
    imports: [TabCommentComponent, NexusModule, ScrollbarComponent, NgbTooltipModule, NgbDropdownModule],
    standalone: true
})
export class TabCommentsComponent {

    quickLinks     = input<Company>()
    projects       = model<Project[]>()
    currentProject = input<Project>()
    path           = input.required<string>()

    stickies: Comment[] = []
    comments: Comment[] = []
    allComments: Comment[] = []
    groupedComments: { date: string, header: string, comments: Comment[] }[] = []

    hasActivity: Record<string, boolean> = {}
    showActivity: Record<string, boolean> = { 'nexus': true }

    #commentService = inject(CommentService)
    #gitService = inject(GitService)
    #globalService = inject(GlobalService)
    #pluginFactory = inject(PluginInstanceFactory)
    #destroyRef = inject(DestroyRef)

    readonly commentTextarea = viewChild<ElementRef<HTMLTextAreaElement>>('commentTextarea');
    readonly scrollbar = viewChild(ScrollbarComponent);

    selectedTarget: 'nexus' | ChatPluginInstance = 'nexus'
    availableChatTargets: ChatPluginInstance[] = []

    constructor() {
        effect(() => {
            this.path();
            this.reload();
        });
    }

    reload() {
        // Detect plugin activity by iterating through instances
        if (this.currentProject) {
            const instances = this.#pluginFactory.getInstances(this.currentProject, ['IRepositoryPluginProperty', 'ITaskPluginProperty', 'IChatPluginProperty'])
            
            // Collect available chat plugin instances
            this.availableChatTargets = instances.filter(i => 
                i instanceof ChatPluginInstance && 
                i.enc && 
                this.#globalService.getEnc(i.enc.key).length > 0
            ) as ChatPluginInstance[]
            
            instances.forEach(instance => {
                const ctorName = instance.constructor?.name
                if (ctorName && instance.enc && this.#globalService.getEnc(instance.enc.key).length > 0) {
                    this.hasActivity[ctorName] = true
                    this.showActivity[ctorName] = this.showActivity[ctorName] ?? true
                }
            })
        }

        this.#commentService.indexFor(this.path()).subscribe(nexusComments => {
            this.allComments = nexusComments.map(c => {
                c.var = c.var || {}
                c.var.source = 'nexus'
                return c
            })
            this.filterAndSortComments()
            
            // Load activity from all plugin types
            if (this.currentProject()) {
                this.loadPluginActivity()
            }
        })
    }

    loadPluginActivity() {
        if (!this.currentProject()) return

        // Load from all plugin types (automatically deduplicates)
        const instances = this.#pluginFactory.getInstances(this.currentProject(),['IRepositoryPluginProperty', 'ITaskPluginProperty', 'IChatPluginProperty'])
        
        instances.forEach(instance => {
            instance.init.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
                this.loadFromInstance(instance)
            })
        })
    }

    loadFromInstance(instance: any) {
        const projectId = (instance as any).projectId || 
                         this.extractProjectId(instance) || 
                         this.currentProject()?.id?.toString() || ''

        instance.getActivityComments(projectId, 150, this.resolveUser.bind(this))
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe({
                next: (commentData: any[]) => {
                    const comments = commentData.map(data => {
                        const comment = Comment.fromJson(data)
                        if (data._icon) (comment as any)._icon = data._icon
                        if (data.var) comment.var = data.var
                        return comment
                    })
                    
                    this.allComments = [...this.allComments, ...comments]
                    this.filterAndSortComments()
                },
                error: (err:any) => { console.error('Failed to load plugin activity:', err) }
            })
    }

    extractProjectId(instance: any): string | undefined {
        if (instance._baseUrl && this.currentProject()) {
            const [gitInstance, path] = this.#gitService.instanceAndPath(this.currentProject()!)
            if (gitInstance === instance && path) {
                return path.replace(/^\/|\/$/g, '').replace(/^projects\//, '')
            }
        }
        return undefined
    }

    // Helper to resolve users from multiple sources
    resolveUser(email?: string, username?: string, name?: string, pluginAttributeName?: string): User | undefined {
        const searchSources: any[] = [
            ...(this.#globalService.teamAll || []),
            ...(this.currentProject()?.assignees?.map((a: any) => a.assignee).filter((u: any) => u?.class === 'User' || u?.class === 'CompanyContact') || [])
        ]
        return searchSources.find((u: User) => {
            // Check plugin-specific attribute (X-NEXUS-GIT or X-NEXUS-MANTISBT)
            if (pluginAttributeName && username) {
                const attrValue = u.card.get(pluginAttributeName)?.[0]?.val()
                if (attrValue === username) return true
            }
            
            // Check email
            if (email && u.card.get('EMAIL')?.some((e: any) => e.val() === email)) return true
            
            // Partial name matching
            if (name) {
                const nameMatch = u.name?.toLowerCase().includes(name.toLowerCase()) || 
                                name.toLowerCase().includes(u.name?.toLowerCase())
                if (nameMatch) return true
            }
            return false
        })
    }



    filterAndSortComments() {
        const filtered = this.allComments
            .filter(c => {
                const source = c.var?.source
                if (!source) return true
                return this.showActivity[source] ?? true
            })
            .sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime())

        this.stickies = filtered.filter(_ => _.is_sticky)
        this.comments = filtered.filter(_ => !_.is_sticky)
        this.groupedComments = this.groupCommentsByDay(this.comments)
        setTimeout(() => this.scrollToBottom(), 0)
    }

    scrollToBottom() {
        const el = this.scrollbar()?.el?.nativeElement
        if (el) el.scrollTop = el.scrollHeight
    }

    groupCommentsByDay(comments: Comment[]): { date: string, header: string, comments: Comment[] }[] {
        const groups = new Map<string, Comment[]>()

        comments.forEach(comment => {
            const date = new Date(comment.created_at || 0)
            const dateKey = date.toDateString()

            if (!groups.has(dateKey)) {
                groups.set(dateKey, [])
            }
            groups.get(dateKey)!.push(comment)
        })
        return Array.from(groups.entries()).map(([dateKey, comments]) => ({
            date: dateKey,
            header: this.getDayHeader(new Date(dateKey)),
            comments
        }))
    }

    getDayHeader(date: Date): string {
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const commentDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
        const diffTime = today.getTime() - commentDate.getTime()
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays === 0) return $localize`:@@i18n.common.today:today`
        if (diffDays === 1) return $localize`:@@i18n.common.yesterday:yesterday`
        if (diffDays < 7) return `${diffDays} ${$localize`:@@i18n.common.daysAgo:days ago`}`
        return date.toLocaleDateString()
    }

    toggleActivity(source: string) {
        this.showActivity[source] = !this.showActivity[source]
        this.filterAndSortComments()
    }

    onQuickLinksLoaded(p:Project[]) {
        this.projects.set(p)
    }

    onNew(event: any) {
        const text = event.target.value.trim();
        if (!text) return
        
        if (this.selectedTarget === 'nexus') {
            this.#commentService.store({ text, path: this.path() }).subscribe(() => {
                this.reload()
                event.target.value = ''
                this.resetTextareaHeight()
            })
        } else {
            // Send to chat plugin
            (this.selectedTarget as ChatPluginInstance).send(text).subscribe(() => {
                this.reload()
                event.target.value = ''
                this.resetTextareaHeight()
            })
        }
    }

    getPlaceholder(): string {
        if (this.selectedTarget === 'nexus') {
            return $localize`:@@i18n.info.newCommentCtrlEnterToSave:New Comment (CTRL+ENTER to save)`
        }
        const pluginName = this.selectedTarget.constructor?.name?.replace('Plugin', '') || 'Chat'
        return $localize`:@@i18n.info.newChatMessage:New ${pluginName} message (CTRL+ENTER to send)`
    }

    getTargetIcon(): string {
        if (this.selectedTarget === 'nexus') return 'nexus'
        return (this.selectedTarget as any).icon?.() || 'chat'
    }

    selectTarget(target: 'nexus' | ChatPluginInstance) {
        this.selectedTarget = target
    }

    onTextareaInput(event: any) {
        const textarea = event.target as HTMLTextAreaElement
        this.adjustTextareaHeight(textarea)
    }

    adjustTextareaHeight(textarea: HTMLTextAreaElement) {
        textarea.style.height = 'auto'
        const newHeight = Math.min(textarea.scrollHeight, 200) // max 200px
        textarea.style.height = newHeight + 'px'
    }

    resetTextareaHeight() {
        const el = this.commentTextarea()?.nativeElement
        if (el) el.style.height = 'auto'
    }
}
