import { ChangeDetectionStrategy, Component, ElementRef, viewChild } from '@angular/core';
import { AutopositionDirective, ECorrection } from '@directives/autoposition.directive';
import { renderComponent } from '@testing/component-test';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'autoposition-host',
    imports: [AutopositionDirective],
    template: `<div #menu class="autoposition dropdown-menu" (corrected)="corrections.push($event)"></div>`,
})
class AutopositionHost {
    readonly menu = viewChild.required<ElementRef<HTMLElement>>('menu');
    corrections: ECorrection[] = [];
}

// MutationObserver delivers its records asynchronously.
const flushObserver = () => new Promise((resolve) => setTimeout(resolve));

describe('AutopositionDirective', () => {
    it('repositions when the menu is shown', async () => {
        const fixture = renderComponent(AutopositionHost);
        fixture.componentInstance.menu().nativeElement.classList.add('show');
        await flushObserver();

        expect(fixture.componentInstance.corrections.length).toBe(1);
    });

    it('stops observing once destroyed, so it cannot emit on a dead output', async () => {
        const fixture = renderComponent(AutopositionHost);
        const menu = fixture.componentInstance.menu().nativeElement;

        // Emitting on a destroyed output is a no-op that Angular reports as NG0953, so the
        // warning is the only observable symptom -- a subscriber-based assertion sees nothing.
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        fixture.destroy();

        // Teardown keeps mutating `class`; without disconnect() the observer fires once more.
        menu.classList.add('show');
        await flushObserver();

        const emitted = warn.mock.calls.flat().join(' ');
        warn.mockRestore();
        expect(emitted).not.toContain('NG0953');
    });
});
