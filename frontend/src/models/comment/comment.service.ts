import { Service } from '@angular/core';
import { Comment } from '@models/comment/comment.model';
import { NexusHttpService } from '../http/http.nexus';

@Service()
export class CommentService extends NexusHttpService<Comment> {
    public apiPath = 'comments';
    override readonly model = Comment;
    indexFor = (path: string) => this.aget(path + '/comments');
}
