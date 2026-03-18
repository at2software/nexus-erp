import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ActionEmitterType } from '@app/nx/nx.directive';
import { Sentinel } from '@models/sentinel.model';
import { SentinelService } from '@models/sentinel.service';
import { NexusModule } from '@app/nx/nexus.module';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';

@Component({
  selector: 'profile-sentinels',
  templateUrl: './profile-sentinels.component.html',
  styleUrl: './profile-sentinels.component.scss',
  standalone: true,
  imports: [ToolbarComponent, NexusModule, RouterModule, NgbTooltipModule, EmptyStateComponent]
})
export class ProfileSentinelsComponent {
  sentinels: Sentinel[] = []

  constructor(
    private sentinelService: SentinelService,
    private router: Router,
  ) {
    this.reload()
  }

  reload = () => this.sentinelService.index().subscribe(_ => {
    this.sentinels = _;
  })

  store = () => new Sentinel().store().subscribe(_ => {
    this.reload()
    this.router.navigate(['profile', 'sentinels', _.id])
  })

  nxResolve(e: ActionEmitterType) {
    if (e.action.title == 'Delete') {
      this.reload()
      this.router.navigate(['profile', 'sentinels'])
    }
  }
}
