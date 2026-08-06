import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { Nx } from '@app/nx/nx.directive';
import { modelListResource } from '@models/http/model-resource';
import { SentinelService } from '@models/sentinel/sentinel.service';
import { TabTasksBaseComponent } from '../tab-tasks-base.component';
import { SentinelActiveItemDto, SentinelLabelConfigDto } from '@models/_core/api-response';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'tab-tasks-sentinels',
    templateUrl: './tab-tasks-sentinels.component.html',
    imports: [Nx],
})
export class TabTasksSentinelsComponent extends TabTasksBaseComponent {
    #sentinelService = inject(SentinelService);

    #response = modelListResource(this.ready, () => this.#sentinelService.indexActive());
    response = this.#response.value;

    constructor() {
        super();
        effect(() => this.countChanged.emit(this.response().reduce((sum, s) => sum + (s.items?.length ?? 0), 0)));
    }

    override reload() {
        this.#response.reload();
    }

    primaryLabel = (s: SentinelLabelConfigDto, m: SentinelActiveItemDto) => m[s.primaryLabel];
    secondaryLabel = (s: SentinelLabelConfigDto, m: SentinelActiveItemDto) => m[s.secondaryLabel];
}
