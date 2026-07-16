import { Dictionary } from '@constants/constants';
import { Company } from '@models/company/company.model';
import { CommentService } from '@models/comment/comment.service';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, effect, inject, input, model, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Comment } from '@models/comment/comment.model';
import { Project } from '@models/project/project.model';
import { User } from '@models/user/user.model';
import { TabCommentComponent } from './tab-comment.component';
import { Nx } from '@app/nx/nx.directive';
import { NComponent } from '@shards/n/n.component';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { GitService } from '@models/http/git.service';
import { GlobalService } from '@models/global.service';
import { NgbTooltipModule, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { ActivityTabComponent } from '../activity-tab.component';
import { PluginInstanceFactory } from '@models/http/plugin.instance.factory';
import { ChatPluginInstance } from '@models/http/chat.plugin.instance';
import { PluginInstance } from '@models/http/plugin.instance';
import { VcardClass } from '@models/vcard/VcardClass';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-tab-comments',
    templateUrl: './tab-comments.component.html',
    styleUrls: ['./tab-comments.component.scss'],
    imports: [TabCommentComponent, Nx, NComponent, ScrollbarComponent, NgbTooltipModule, NgbDropdownModule],
})
export class TabCommentsComponent {
    quickLinks = input<Company>();
    projects = model<Project[]>();
    currentProject = input<Project>();
    path = input.required<string>();

    stickies = signal<Comment[]>([]);
    #allComments = signal<Comment[]>([]);
    groupedComments = signal<{ date: string; header: string; comments: Comment[] }[]>([]);

    hasActivity = signal<Dictionary<boolean>>({});
    showActivity = signal<Dictionary<boolean>>({ nexus: true });

    #commentService = inject(CommentService);
    #gitService = inject(GitService);
    #globalService = inject(GlobalService);
    #pluginFactory = inject(PluginInstanceFactory);
    #destroyRef = inject(DestroyRef);

    readonly commentTextarea = viewChild<ElementRef<HTMLTextAreaElement>>('commentTextarea');
    readonly scrollbar = viewChild(ScrollbarComponent);

    selectedTarget: 'nexus' | ChatPluginInstance = 'nexus';
    availableChatTargets = signal<ChatPluginInstance[]>([]);

    constructor() {
        effect(() => {
            this.path();
            this.reload();
        });

        const activityTab = inject(ActivityTabComponent);        
        activityTab.onFocus = () => setTimeout(() => this.scrollToBottom(), 0);
    }

    reload() {
        // Detect plugin activity by iterating through instances
        const currentProject = this.currentProject();
        if (currentProject) {
            const instances = this.#pluginFactory.getInstances(currentProject, ['IRepositoryPluginProperty', 'ITaskPluginProperty', 'IChatPluginProperty']);

            // Collect available chat plugin instances
            this.availableChatTargets.set(instances.filter((i) => i instanceof ChatPluginInstance && i.enc && this.#globalService.getEnc(i.enc.key).length > 0) as ChatPluginInstance[]);

            instances.forEach((instance) => {
                const ctorName = instance.constructor?.name;
                if (ctorName && instance.enc && this.#globalService.getEnc(instance.enc.key).length > 0) {
                    this.hasActivity.update((h) => ({ ...h, [ctorName]: true }));
                    this.showActivity.update((s) => ({ ...s, [ctorName]: s[ctorName] ?? true }));
                }
            });
        }

        this.#commentService.indexFor(this.path()).subscribe((nexusComments) => {
            this.#allComments.set(nexusComments.map((c) => {
                c.var = c.var || {};
                c.var.source = 'nexus';
                return c;
            }));
            this.filterAndSortComments();

            // Load activity from all plugin types
            if (this.currentProject()) {
                this.loadPluginActivity();
            }
        });
    }

    loadPluginActivity() {
        if (!this.currentProject()) return;

        // Load from all plugin types (automatically deduplicates)
        const instances = this.#pluginFactory.getInstances(this.currentProject(), ['IRepositoryPluginProperty', 'ITaskPluginProperty', 'IChatPluginProperty']);

        instances.forEach((instance) => {
            instance.init.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
                this.loadFromInstance(instance);
            });
        });
    }

    loadFromInstance(instance: PluginInstance) {
        const projectId = instance.projectId || this.extractProjectId(instance) || this.currentProject()?.id?.toString() || '';

        instance
            .getActivityComments(projectId, 150, this.resolveUser.bind(this))
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe({
                next: (commentData) => {
                    const comments = commentData.map((data) => Comment.fromJson(data));

                    this.#allComments.set([...this.#allComments(), ...comments]);
                    this.filterAndSortComments();
                },
                error: (err: unknown) => {
                    console.error('Failed to load plugin activity:', err);
                },
            });
    }

    extractProjectId(instance: PluginInstance): string | undefined {
        if (instance._baseUrl && this.currentProject()) {
            const [gitInstance, path] = this.#gitService.instanceAndPath(this.currentProject()!);
            if ((gitInstance as unknown) === instance && path) {
                return path.replace(/^\/|\/$/g, '').replace(/^projects\//, '');
            }
        }
        return undefined;
    }

    // Helper to resolve users from multiple sources
    resolveUser(email?: string, username?: string, name?: string, pluginAttributeName?: string): User | undefined {
        const searchSources: VcardClass[] = [
            ...(this.#globalService.teamAll || []),
            ...(this.currentProject()
                ?.assignees?.map((a) => a.assignee)
                .filter((u) => u?.class === 'User' || u?.class === 'CompanyContact') || []),
        ];
        return searchSources.find((u) => {
            // Check plugin-specific attribute (X-NEXUS-GIT or X-NEXUS-MANTISBT)
            if (pluginAttributeName && username) {
                const attrValue = u.card()?.get(pluginAttributeName)?.[0]?.val();
                if (attrValue === username) return true;
            }

            // Check email
            if (email && u.card()?.get('EMAIL')?.some((e) => e.val() === email)) return true;

            // Partial name matching
            if (name) {
                const nameMatch = u.getName()?.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(u.getName()?.toLowerCase());
                if (nameMatch) return true;
            }
            return false;
        }) as User | undefined;
    }

    filterAndSortComments() {
        const filtered = this.#allComments()
            .filter((c) => {
                const source = c.var?.source;
                if (!source) return true;
                return this.showActivity()[source] ?? true;
            })
            .sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());

        this.stickies.set(filtered.filter((_) => _.is_sticky));
        this.groupedComments.set(this.groupCommentsByDay(filtered.filter((_) => !_.is_sticky)));
        setTimeout(() => this.scrollToBottom(), 0);
    }

    scrollToBottom() {
        const el = this.scrollbar()?.el?.nativeElement;
        if (el) el.scrollTop = el.scrollHeight;
    }

    groupCommentsByDay(comments: Comment[]): { date: string; header: string; comments: Comment[] }[] {
        const groups = new Map<string, Comment[]>();

        comments.forEach((comment) => {
            const date = new Date(comment.created_at || 0);
            const dateKey = date.toDateString();

            if (!groups.has(dateKey)) {
                groups.set(dateKey, []);
            }
            groups.get(dateKey)!.push(comment);
        });
        return Array.from(groups.entries()).map(([dateKey, comments]) => ({
            date: dateKey,
            header: this.getDayHeader(new Date(dateKey)),
            comments,
        }));
    }

    getDayHeader(date: Date): string {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const commentDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const diffTime = today.getTime() - commentDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return $localize`:@@i18n.common.today:today`;
        if (diffDays === 1) return $localize`:@@i18n.common.yesterday:yesterday`;
        if (diffDays < 7) return `${diffDays} ${$localize`:@@i18n.common.daysAgo:days ago`}`;
        return date.toLocaleDateString();
    }

    toggleActivity(source: string) {
        this.showActivity.update((s) => ({ ...s, [source]: !s[source] }));
        this.filterAndSortComments();
    }

    onQuickLinksLoaded(p: Project[]) {
        this.projects.set(p);
    }

    onNew(event: Event) {
        const target = event.target as HTMLTextAreaElement;
        const text = target.value.trim();
        if (!text) return;

        if (this.selectedTarget === 'nexus') {
            this.#commentService.store({ text, path: this.path() }).subscribe(() => {
                this.reload();
                target.value = '';
                this.resetTextareaHeight();
            });
        } else {
            // Send to chat plugin
            (this.selectedTarget as ChatPluginInstance).send(text).subscribe(() => {
                this.reload();
                target.value = '';
                this.resetTextareaHeight();
            });
        }
    }

    getPlaceholder(): string {
        if (this.selectedTarget === 'nexus') {
            return $localize`:@@i18n.info.newCommentCtrlEnterToSave:New Comment (CTRL+ENTER to save)`;
        }
        const pluginName = this.selectedTarget.constructor?.name?.replace('Plugin', '') || 'Chat';
        return $localize`:@@i18n.info.newChatMessage:New ${pluginName} message (CTRL+ENTER to send)`;
    }

    getTargetIcon(): string {
        if (this.selectedTarget === 'nexus') return 'nexus';
        return this.selectedTarget.icon() || 'chat';
    }

    selectTarget(target: 'nexus' | ChatPluginInstance) {
        this.selectedTarget = target;
    }

    onTextareaInput(event: Event) {
        const textarea = event.target as HTMLTextAreaElement;
        this.adjustTextareaHeight(textarea);
    }

    adjustTextareaHeight(textarea: HTMLTextAreaElement) {
        textarea.style.height = 'auto';
        const newHeight = Math.min(textarea.scrollHeight, 200); // max 200px
        textarea.style.height = newHeight + 'px';
    }

    resetTextareaHeight() {
        const el = this.commentTextarea()?.nativeElement;
        if (el) el.style.height = 'auto';
    }
}
