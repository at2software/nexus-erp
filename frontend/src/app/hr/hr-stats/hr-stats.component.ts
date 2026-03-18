import { Component, inject, OnDestroy, OnInit } from '@angular/core';

import { RouterModule, Router } from '@angular/router';
import { GlobalService } from '@models/global.service';
import { User } from '@models/user/user.model';
import { Subject, takeUntil } from 'rxjs';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import { Color } from '@constants/Color';

@Component({
  selector: 'hr-stats',
  standalone: true,
  imports: [RouterModule, AvatarComponent],
  templateUrl: './hr-stats.component.html',
  styleUrl: './hr-stats.component.scss'
})
export class HrStatsComponent implements OnInit, OnDestroy {
  
  
  team: User[] = [];
  #destroy$ = new Subject<void>();
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
    this.#global.init.pipe(takeUntil(this.#destroy$)).subscribe(() => {
      this.team = this.#global.team
    });
  }

  ngOnDestroy() {
    this.#destroy$.next();
    this.#destroy$.complete();
  }

  navigateToStats(route: string) {
    this.#router.navigate(['/hr/stats', route]);
  }

  getHpwBadgeColor(hpw: number): string {
    // Everything below 20 hours is red, 20-40 hours transitions red to green
    if (hpw < 20) {
      return Color.fromHsl(0, 70, 45).toHexString(); // Red
    }
    
    const normalizedHpw = Math.min(hpw, 40); // Cap at 40 for full green
    const hue = ((normalizedHpw - 20) / 20) * 120; // 20hrs = red (0), 40hrs = green (120)
    return Color.fromHsl(hue, 70, 45).toHexString();
  }
  
}
