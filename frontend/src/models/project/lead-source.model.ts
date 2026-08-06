import type { NxAction } from '@models/_core/nx.actions';
import { Serializable } from '@models/_core/serializable';
import { getLeadSourceActions } from './lead-source.actions';
import { Model } from '@constants/model/type-discriminators';
import { computed } from '@angular/core';

@Model('LeadSource')
export class LeadSource extends Serializable {
    static API_PATH = (): string => 'lead_sources';

    override readonly getAvatar = computed(() => 'assets/icons/lead_source.png');

    name: string = '';

    protected override buildActions(): NxAction[] { return getLeadSourceActions(this) }
}
