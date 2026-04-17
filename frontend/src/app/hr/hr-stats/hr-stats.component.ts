import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { RouterModule, Router } from '@angular/router';
import { GlobalService } from '@models/global.service';
import { User } from '@models/user/user.model';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import { Color } from '@constants/Color';

@Component({
  selector: 'hr-stats',
  standalone: true,
  imports: [RouterModule, AvatarComponent],
  templateUrl: './hr-stats.component.html',
  styleUrl: './hr-stats.component.scss'
})
export class HrStatsComponent implements OnInit {

  team: User[] = [];
  #destroyRef = inject(DestroyRef);
  #global = inject(GlobalService);
  #router = inject(Router);

  statsItems = [
    {
      title: 'Focus Categories',
      description: 'Analyze time allocation across different work categories',
      route: 'focus-categories',
      icon: 'category'
    },
    {
      title: 'Workload',
      description: 'Track team workload and productivity metrics',
      route: 'workload',
      icon: 'assessment'
    },
    {
      title: 'Prediction Accuracy',
      description: 'Compare predicted vs actual effort for completed projects',
      route: 'prediction-accuracy',
      icon: 'target'
    },
    {
      title: 'Invoice Focus',
      description: 'Analyze percentage of time spent on foci with invoice items',
      route: 'invoice-focus',
      icon: 'visibility'
    }
  ];

  ngOnInit() {
    this.#global.init.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      this.team = this.#global.team
    });
  }

  navigateToStats(route: string) {
    this.#router.navigate(['/hr/stats', route]);
  }

  getHpwBadgeColor(hpw: number): string {
    if (!hpw) return new Color('#6c757d').toHexString()
    if (hpw >= 38) return new Color('#198754').toHexString()
    if (hpw >= 20) return new Color('#fd7e14').toHexString()
    return new Color('#dc3545').toHexString()
  }
}
