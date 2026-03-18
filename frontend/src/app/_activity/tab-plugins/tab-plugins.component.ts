import { Component, inject, OnInit } from '@angular/core';
import { GlobalService } from 'src/models/global.service';
import { PluginInstance } from 'src/models/http/plugin.instance';
import { PluginInstanceFactory } from 'src/models/http/plugin.instance.factory';
import { Project } from 'src/models/project/project.model';
import { InputModalService } from '@app/_modals/modal-input/modal-input.component';
import { PluginLinkService } from 'src/models/pluginLink/plugin-link.service';
import { ActivityTabComponent } from '@activity/activity-tab.component';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { RsaSettingsEmptyComponent } from '@shards/rsa-settings/rsa-settings-empty.component';
import { RsaSettingsComponent } from '@shards/rsa-settings/rsa-settings.component';

import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { NexusModule } from '@app/nx/nexus.module';

@Component({
    selector: 'activity-tab-plugins',
    templateUrl: './tab-plugins.component.html',
    styleUrls: ['./tab-plugins.component.scss'],
    standalone: true,
    imports: [ActivityTabComponent, ScrollbarComponent, RsaSettingsEmptyComponent, RsaSettingsComponent, NgbTooltipModule, NexusModule]
})
export class TabPluginsComponent implements OnInit {

    project?:Project

    global = inject(GlobalService)
    factory = inject(PluginInstanceFactory)
    pluginLinkService = inject(PluginLinkService)
    modalService = inject(InputModalService)
    
    ngOnInit() {
        this.global.onRootObjectSelected.subscribe((obj) => {
            if (obj instanceof Project) {
                this.project = obj
            } else {
                this.project = undefined
            }
        })
    }
    onNewPluginLink(_:PluginInstance) {
        this.modalService.open(_.newPluginText).then((response) => {
            if (response && 'text' in response) {
                this.pluginLinkService.store(_.toPluginLink(response!.text), this.project).subscribe(_ => {
                    this.project?.plugin_links.push(_)
                })
            }
        }).catch()
    }
    onNewPluginChannel(_:PluginInstance) {
      this.pluginLinkService.createChannel(_.toPluginLink(''), this.project).subscribe(_ => {
          this.project?.plugin_links.push(_)
      })
    }
}
