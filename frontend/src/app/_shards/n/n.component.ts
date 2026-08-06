import { ChangeDetectionStrategy, Component, ElementRef, AfterViewInit, inject } from '@angular/core';

@Component({
    selector: 'n',
    templateUrl: './n.component.html',
    styleUrls: ['./n.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NComponent implements AfterViewInit {
    elementRef: ElementRef = inject(ElementRef);

    ngAfterViewInit() {
        const content = this.elementRef.nativeElement.textContent?.trim();
        if (content === 'local_ai') {
            this.elementRef.nativeElement.classList.add('ai-animated');
        }
    }
}
