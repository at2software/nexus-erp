import { CommentService } from './comment.service';
import { Serializable } from './../serializable';
import { User } from './../user/user.model';
import { NxAction } from '@app/nx/nx.actions';
import { NxGlobal } from '@app/nx/nx.global';
import { Type } from 'class-transformer';
import { getCommentActions } from './comment.actions';
import { Model, TypeFromClass } from '@constants/type-discriminators';
import { computed } from '@angular/core';

@Model('Comment')
export class Comment extends Serializable {
    static API_PATH = (): string => 'comments';
    SERVICE = CommentService;

    text: string = '';
    type: string = '';
    is_sticky: boolean = false;
    is_mini: boolean = false;
    user_id?: string;

    reactions?: { emoji: string; count: number }[];
    attachments?: { id: string; name: string; mimeType: string; isImage: boolean; size: number; blobUrl?: string }[];

    @Type(()=>User) user!: User;
    @TypeFromClass() parent: any;

    css = computed(() => (['grey', 'info', 'danger', 'warning'][this.snapshot().type as any] ?? 'white') as string);
    isMyUser = computed(() => NxGlobal.global.user?.id === this.snapshot().user_id);
    formattedText = computed(() => this.#formattedText(this.snapshot().text));
    doubleClickAction: number = 0;
    actions: NxAction[] = getCommentActions(this);
    getIcon = computed(() => (['chat', 'info', 'dangerous', 'warning'][this.snapshot().type as any] ?? 'white') as string);

    #formattedText = (text: string) => {
        let _ = text;
        // Only replace URLs that are not already inside an <a> tag
        // Use negative lookbehind to check if URL is not preceded by href="
        _ = _.replace(/(?<!href=["'])((http|ftp|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-]))/g, '<a href="$1" class="text-primary" target="_blank" title="$1"><i>link</i></a>');
        return _;
    };
}
