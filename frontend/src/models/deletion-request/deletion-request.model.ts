import { Serializable } from '@models/_core/serializable';
import { User } from '../user/user.model';
import { Model, TypeFromClass } from '@constants/model/type-discriminators';
import { Type } from '@models/_core/hydrate';
import { computed } from '@angular/core';

@Model('DeletionRequest')
export class DeletionRequest extends Serializable {
    static API_PATH = (): string => 'deletion_requests';

    user_id?: string;
    model_type: string = '';
    reason: string = '';

    @Type(() => User) user!: User;
    @TypeFromClass() model: Serializable | null = null;

    targetClass = computed(() => (this.snapshot().model_type as string ?? '').replace(/^App\\Models\\/, ''));
}
