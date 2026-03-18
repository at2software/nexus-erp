import { Injectable } from '@angular/core';
import { Comment } from 'src/models/comment/comment.model';
import { NexusHttpService } from '../http/http.nexus';

@Injectable({ providedIn: 'root' })
export class CommentService extends NexusHttpService<Comment> {
  public TYPE = () => Comment
  public apiPath = 'comments'
  indexFor = (path:string) => this.aget(path + '/comments')
  store = (data:object) => this.post('comments', data)
}
