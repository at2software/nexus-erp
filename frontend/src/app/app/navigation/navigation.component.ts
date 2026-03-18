import { GlobalService } from 'src/models/global.service';
import { Component, HostListener, inject, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { SearchInputComponent } from '@shards/search-input/search-input.component';
import { Router, RouterModule } from '@angular/router';
import { fromEvent, Subscription } from 'rxjs';
import { NexusModule } from '@app/nx/nexus.module';
import { HotkeyDirective } from '@directives/hotkey.directive';
import { GuidedTourComponent } from '@shards/guided-tour/guided-tour.component';

@Component({
    selector: 'app-navigation',
    templateUrl: './navigation.component.html',
    styleUrls: ['./navigation.component.scss'],
    standalone: true,
    imports: [NexusModule, SearchInputComponent, RouterModule, HotkeyDirective, GuidedTourComponent]
})
export class NavigationComponent implements OnInit, OnDestroy {

    @ViewChild(SearchInputComponent) searchbox: any

    searchExpanded: boolean = false
    isMobile: boolean = false
    isMenuOpen: boolean = false
    #resizeSubscription?: Subscription
    #initSubscription?: Subscription

    global = inject(GlobalService)
    router = inject(Router)

    get navigationItems() { return this.global.navigationItems }
    get bottomNavigationItems() { return this.global.bottomNavigationItems }

    navVisible = (logo: string) => this.navigationItems.some(i => i.logo === logo && i.visible)
    bottomNavVisible = (logo: string) => this.bottomNavigationItems.some(i => i.logo === logo && i.visible)

    onSearchExpand() {
        this.searchExpanded = !this.searchExpanded
        if (this.searchExpanded) {
            this.searchbox.focus()
        } else {
            this.clearSearch()
        }
    }

    clearSearch() {
        this.searchbox.blur()
        this.searchbox.clear()
        this.searchbox.empty()
        this.searchExpanded = false
    }

    pathFor(o: any) {
        switch (o.class) {
            case 'Company': return '/customers/' + o.id
            case 'CompanyContact': return '/customers/' + o.company_id
            case 'Project': return '/projects/' + o.id
            case 'Product': return '/products/' + o.id
            case 'Invoice': return '/invoices/' + o.id
        }
        return '/'
    }

    onSelect(e: any) {
        this.clearSearch()
        this.router.navigate([this.pathFor(e)])
    }

    ngOnInit() {
        this.#initSubscription = this.global.init.subscribe(() => {
            this.#checkIfMobile()
            this.#resizeSubscription = fromEvent(window, 'resize').subscribe(() => {
                this.#checkIfMobile()
            })
        })
    }

    ngOnDestroy() {
        this.#resizeSubscription?.unsubscribe()
        this.#initSubscription?.unsubscribe()
    }

    #checkIfMobile() {
        this.isMobile = window.innerWidth <= 768
        if (!this.isMobile) {
            this.isMenuOpen = false
        }
    }

    toggleMobileMenu() {
        this.isMenuOpen = !this.isMenuOpen
    }

    closeMobileMenu() {
        this.isMenuOpen = false
    }

    @HostListener('document:click', ['$event']) onDocumentClick(event: MouseEvent) {
        if (this.searchbox && !this.searchbox.el.nativeElement.contains(event.target)) {
            const totalOffset = event.layerX + event.layerY + event.clientX + event.clientY
            if (totalOffset > 0) {
                this.clearSearch()
            }
        }

        if (this.isMobile && this.isMenuOpen) {
            const target = event.target as HTMLElement
            if (!target.closest('app-navigation') && !target.closest('.mobile-burger-btn')) {
                this.closeMobileMenu()
            }
        }
    }
}
