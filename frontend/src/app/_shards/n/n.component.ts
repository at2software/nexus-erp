import { Component, ElementRef, AfterViewInit, inject } from '@angular/core';

@Component({
    selector: 'n',
    templateUrl: './n.component.html',
    styleUrls: ['./n.component.scss'],
    standalone: true
})
export class NComponent implements AfterViewInit {
    
    elementRef: ElementRef = inject(ElementRef);
    
    ngAfterViewInit() {
        // Check if the content is 'local_ai' and add AI animation class
        const content = this.elementRef.nativeElement.textContent?.trim();
        if (content === 'local_ai') {
            this.elementRef.nativeElement.classList.add('ai-animated');
        }
    }
}
