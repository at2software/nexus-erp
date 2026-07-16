import { Injectable } from '@angular/core';
import { NexusHttpService } from '../http/http.nexus';
import { DeletionRequest } from './deletion-request.model';
import { Serializable } from '../serializable';

@Injectable({ providedIn: 'root' })
export class DeletionRequestService extends NexusHttpService<DeletionRequest> {
    public apiPath = 'deletion_requests';
    override readonly model = DeletionRequest;

    indexPending = () => this.aget('deletion_requests', {}, DeletionRequest);
    requestDeletion = (target: Serializable, reason: string) =>
        this.post('deletion_requests', { model_type: target.getModelName(), model_id: target.id, reason }, DeletionRequest);
    approve = (req: DeletionRequest) => this.put(`deletion_requests/${req.id}/approve`, {}, Object);
}
