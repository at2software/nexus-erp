import { Serializable } from '@models/_core/serializable';
import { User } from './../user/user.model';
import { NxAction } from '@models/_core/nx.actions';
import { nx } from '@models/_core/nx-bridge';
import { Type } from '@models/_core/hydrate';
import { getCommentActions } from './comment.actions';
import { Model, TypeFromClass } from '@constants/model/type-discriminators';
import { computed } from '@angular/core';

@Model('Comment')
export class Comment extends Serializable {
    static API_PATH = (): string => 'comments';

    override readonly getName = computed(() => { this.snapshot(); return this.user?.getName() ?? ''; });

    text: string = '';
    type: string = '';
    is_sticky: boolean = false;
    is_mini: boolean = false;
    user_id?: string;

    reactions?: { emoji: string; count: number }[];
    attachments?: { id: string; name: string; mimeType: string; isImage: boolean; size: number; blobUrl?: string }[];

    @Type(()=>User) user!: User;
    @TypeFromClass() parent: any;

    css = computed(() => (['grey', 'info', 'danger', 'warning'][this.snapshot().type as number] ?? 'white') as string);
    isMyUser = computed(() => nx().global.user?.id === this.snapshot().user_id);
    formattedText = computed(() => this.#formattedText(this.snapshot().text));
    protected override buildActions(): NxAction[] { return getCommentActions(this) }
    getIcon = computed(() => (['chat', 'info', 'dangerous', 'warning'][this.snapshot().type as number] ?? 'white') as string);

    #formattedText = (text: string) => {
        let _ = text;
        _ = _.replace(/(?<!href=["'])((http|ftp|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-]))/g, '<a href="$1" class="text-primary" target="_blank" title="$1"><i>link</i></a>');
        return _;
    };
}
