import { AfterViewInit, Component, ElementRef, HostBinding, inject, OnDestroy, OnInit, Renderer2, ViewChild } from '@angular/core';
import { fromEvent, Subject, Subscription } from 'rxjs';
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
export class HeaderComponent implements OnInit, AfterViewInit, OnDestroy {

    @ViewChild('toolbar') toolbar: ElementRef
    @ViewChild('content') content!: ElementRef
    @HostBinding('class.scrolled') isScrolled = false

    isMobile = false
    navItems: any[] = []
    activeNavItem: any = null
    resizeSubscription?: Subscription
    #destroy$ = new Subject<void>();

    #toolbarService = inject(ToolbarService)
    #re = inject(Renderer2)
    globalService = inject(GlobalService)
    #authService = inject(AuthenticationService)
    sidebarStateService = inject(ActivitySidebarStateService)

    ngOnInit() {
        this.#checkIfMobile()
        this.resizeSubscription = fromEvent(window, 'resize').subscribe(() => {
            this.#checkIfMobile()
        })
        const scrollContainer = document.querySelector('.app-scroll')!;
        debounceListener(this.#destroy$, scrollContainer, 'scroll', (scroll) => scroll.target.scrollTop > 0).subscribe(isScrolled => {
            this.isScrolled = isScrolled
        });
    }

    #checkIfMobile() {
        this.isMobile = window.innerWidth <= 768
    }

    ngAfterViewInit(): void {
        this.#toolbarService.register(this)

        const ul = this.content.nativeElement.querySelector('ul.nav')
        if (ul) {
            const clientWidth = this.content.nativeElement.clientWidth
            const style = getComputedStyle(this.content.nativeElement)
            const paddingLeft = parseFloat(style.paddingLeft)
            const paddingRight = parseFloat(style.paddingRight)
            const contentWidth = clientWidth - paddingLeft - paddingRight
            ul.style.width = `${contentWidth}px`
            
            this.#extractNavItems(ul)
            
            // Set up periodic refresh to catch route changes
            // setTimeout(() => {
            //     this.refreshAndUpdate()
            // }, 500) // Give Angular router time to set active states
            
            // setInterval(() => {
            //     if (this.isMobile && (this.navItems || []).length > 0) {
            //         this.refreshAndUpdate()
            //     }
            // }, 1000) // Check every second for route changes
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
        
        // Find active item with multiple fallback methods
        this.activeNavItem = this.navItems.find(item => item.active) || 
                           this.navItems.find(item => item.anchor?.classList.contains('active')) ||
                           this.navItems.find(item => window.location.pathname.includes(item.routerLink)) ||
                           this.navItems[0]
                           
    }

    ngOnDestroy(): void { 
        this.#toolbarService.unregister()
        if (this.resizeSubscription) {
            this.resizeSubscription.unsubscribe()
        }
        this.#destroy$.next();
        this.#destroy$.complete();
    }
    remove = (x: ElementRef) => this.#re.removeChild(this.toolbar.nativeElement, x.nativeElement)
    add = (x: ElementRef) => { this.#re.appendChild(this.toolbar.nativeElement, x.nativeElement) }
    prepend = (x: ElementRef) => { this.#re.insertBefore(this.toolbar.nativeElement, x.nativeElement, this.toolbar.nativeElement.firstChild) }

    onActivityTabClicked = () => {
        this.sidebarStateService.toggleSidebar();
    }
    logout = () => {
        this.#authService.logout()
    }
}
