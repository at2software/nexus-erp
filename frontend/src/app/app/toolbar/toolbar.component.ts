import { AfterViewInit, Component, ElementRef, inject, OnDestroy } from '@angular/core';
import { ToolbarService } from './toolbar.service';

@Component({
    selector: 'toolbar',
    templateUrl: './toolbar.component.html',
    styleUrls: ['./toolbar.component.scss'],
    standalone: true
})
export class ToolbarComponent implements AfterViewInit, OnDestroy {

  #toolbarService:ToolbarService = inject(ToolbarService)
  #el:ElementRef = inject(ElementRef)

  ngAfterViewInit(): void { this.#toolbarService.add(this.#el) }
  ngOnDestroy (): void { this.#toolbarService.component?.remove(this.#el) }

}
