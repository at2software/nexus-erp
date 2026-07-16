import { Serializable } from '../serializable';
import { User } from '../user/user.model';
import { DeletionRequestService } from './deletion-request.service';
import { Model, TypeFromClass } from '@constants/type-discriminators';
import { Type } from 'class-transformer';
import { computed } from '@angular/core';

@Model('DeletionRequest')
export class DeletionRequest extends Serializable {
    static API_PATH = (): string => 'deletion_requests';
    SERVICE = DeletionRequestService;

    user_id?: string;
    model_type: string = '';
    reason: string = '';

    @Type(() => User) user!: User;
    @TypeFromClass() model: Serializable | null = null;

    /** Class basename of the target, e.g. "File". */
    targetClass = computed(() => (this.snapshot().model_type as string ?? '').replace(/^App\\Models\\/, ''));
}
