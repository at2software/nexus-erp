import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HeaderComponent } from '@app/app/header/header.component';
import { HeaderLinkItemComponent } from '@app/app/header/header-link-item/header-link-item.component';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { HotkeyDirective } from '@directives/hotkey.directive';

@Component({
    selector: 'document-dashboard',
    templateUrl: './document-dashboard.component.html',
    styleUrls: ['./document-dashboard.component.scss'],
    standalone: true,
    imports: [HeaderComponent, HeaderLinkItemComponent, ScrollbarComponent, HotkeyDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentDashboardComponent {}
