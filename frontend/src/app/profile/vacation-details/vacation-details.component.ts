import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { GlobalService } from '@models/global.service';
import { VacationGuardComponent } from './vacation-guard.component';
import { HeaderComponent } from '@app/app/header/header.component';
import { HeaderLinkItemComponent } from '@app/app/header/header-link-item/header-link-item.component';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { RouterModule } from '@angular/router';
import { DatePipe } from '@angular/common';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { SafePipe } from '@pipes/safe.pipe';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'vacation-details',
    templateUrl: './vacation-details.component.html',
    styleUrls: ['./vacation-details.component.scss'],
    standalone: true,
    imports: [HeaderComponent, HeaderLinkItemComponent, ScrollbarComponent, RouterModule, DatePipe, NgbTooltipModule, SafePipe],
})
export class VacationDetailsComponent {
    global = inject(GlobalService);
    parent = inject(VacationGuardComponent);

    onApprove = () => {
        this.parent.object().approve().subscribe(() => this.parent.reload());
    };

    onDeny = () => {
        const object = this.parent.object();
        object.modalInput($localize`:@@i18n.confirm.pleaseSpecifyAReason:please specify a reason:`).then((reason) => {
            if (reason !== null && reason !== undefined) {
                object.deny(reason.text).subscribe(() => this.parent.reload());
            }
        });
    };
}
