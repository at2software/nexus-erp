import { Component, ElementRef, inject } from '@angular/core';
import { ContinuousScrollComponent } from 'src/app/_shards/continuous/continuous.scroll.component';

@Component({
    selector: 'scrollbar',
    templateUrl: './scrollbar.component.html',
    styleUrls: ['./scrollbar.component.scss'],
    host: { class: 'custom-scrollbar' },
    imports: [],
    standalone: true
})
export class ScrollbarComponent extends ContinuousScrollComponent { 
  el = inject(ElementRef)
}