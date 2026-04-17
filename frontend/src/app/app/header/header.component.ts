import { AfterViewInit, Component, DestroyRef, ElementRef, HostBinding, inject, OnDestroy, Renderer2, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';
import { ToolbarService } from '../toolbar/toolbar.service';
import { GlobalService } from 'src/models/global.service';
import { AuthenticationService } from 'src/models/auth.service';
import { ActivitySidebarStateService } from '../../_activity/activity-sidebar-state.service';
import { ToolbarComponent } from '../toolbar/toolbar.component';
import { debounceListener } from '@constants/debounceListener';

@Component({
    selector: 'app-header',
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss'],
    standalone: true,
    imports: [ToolbarComponent]
})
export class HeaderComponent implements AfterViewInit, OnDestroy {

    toolbar = viewChild<ElementRef>('toolbar')
    content = viewChild.required<ElementRef>('content')
    @HostBinding('class.scrolled') isScrolled = false

    isMobile = false
    navItems: any[] = []
    activeNavItem: any = null
    #destroyRef = inject(DestroyRef)

    #toolbarService = inject(ToolbarService)
    #re = inject(Renderer2)
    globalService = inject(GlobalService)
    #authService = inject(AuthenticationService)
    sidebarStateService = inject(ActivitySidebarStateService)

    constructor() {
        this.#checkIfMobile()
        fromEvent(window, 'resize')
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe(() => this.#checkIfMobile())
        const scrollContainer = document.querySelector('.app-scroll')!;
        debounceListener(this.#destroyRef, scrollContainer, 'scroll', (scroll) => scroll.target.scrollTop > 0)
            .subscribe(isScrolled => this.isScrolled = isScrolled)
    }

    #checkIfMobile() {
        this.isMobile = window.innerWidth <= 768
    }

    ngAfterViewInit(): void {
        this.#toolbarService.register(this)

        const ul = this.content().nativeElement.querySelector('ul.nav')
        if (ul) {
            const clientWidth = this.content().nativeElement.clientWidth
            const style = getComputedStyle(this.content().nativeElement)
            const paddingLeft = parseFloat(style.paddingLeft)
            const paddingRight = parseFloat(style.paddingRight)
            const contentWidth = clientWidth - paddingLeft - paddingRight
            ul.style.width = `${contentWidth}px`
            this.#extractNavItems(ul)
        }
    }

    #extractNavItems(ul: HTMLElement) {
        const headerLinkItems = ul.querySelectorAll('header-link-item')
        this.navItems = Array.from(headerLinkItems).map(item => {
            const anchor = item.querySelector('a.nav-link')
            const isActive = anchor?.classList.contains('active') ||
                           anchor?.getAttribute('aria-current') === 'page' ||
                           anchor?.hasAttribute('routerLinkActive')
            return {
                title: anchor?.textContent?.trim() || '',
                routerLink: anchor?.getAttribute('routerLink') || anchor?.getAttribute('ng-reflect-router-link') || '',
                active: isActive,
                element: item,
                anchor: anchor
            }
        })
        this.activeNavItem = this.navItems.find(item => item.active) ||
                           this.navItems.find(item => item.anchor?.classList.contains('active')) ||
                           this.navItems.find(item => window.location.pathname.includes(item.routerLink)) ||
                           this.navItems[0]
    }

    ngOnDestroy(): void {
        this.#toolbarService.unregister()
    }
    remove  = (x: ElementRef) => this.#re.removeChild(this.toolbar()!.nativeElement, x.nativeElement)
    add     = (x: ElementRef) => { this.#re.appendChild(this.toolbar()!.nativeElement, x.nativeElement) }
    prepend = (x: ElementRef) => { this.#re.insertBefore(this.toolbar()!.nativeElement, x.nativeElement, this.toolbar()!.nativeElement.firstChild) }

    onActivityTabClicked = () => this.sidebarStateService.toggleSidebar()
    logout = () => this.#authService.logout()
}
