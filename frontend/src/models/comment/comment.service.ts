import { Injectable } from '@angular/core';
import { Comment } from '@models/comment/comment.model';
import { NexusHttpService } from '../http/http.nexus';

@Injectable({ providedIn: 'root' })
export class CommentService extends NexusHttpService<Comment> {
    public apiPath = 'comments';
    override readonly model = Comment;
    indexFor = (path: string) => this.aget(path + '/comments');
    store = (data: object) => this.post('comments', data);
}
