import { Component } from '@angular/core';
import { HeaderModule } from '@app/app/header/header.module';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { HotkeyDirective } from '@directives/hotkey.directive';

@Component({
    selector: 'document-dashboard',
    templateUrl: './document-dashboard.component.html',
    styleUrls: ['./document-dashboard.component.scss'],
    standalone: true,
    imports: [HeaderModule, ScrollbarComponent, HotkeyDirective]
})
export class DocumentDashboardComponent {

}
