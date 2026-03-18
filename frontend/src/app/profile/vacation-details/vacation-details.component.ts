import { Component, inject } from '@angular/core';
import { GlobalService } from 'src/models/global.service';
import { VacationGuardComponent } from './vacation-guard.component';
import { HeaderModule } from '@app/app/header/header.module';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { SafePipe } from 'src/pipes/safe.pipe';

@Component({
    selector: 'vacation-details',
    templateUrl: './vacation-details.component.html',
    styleUrls: ['./vacation-details.component.scss'],
    standalone: true,
    imports: [HeaderModule, ScrollbarComponent, RouterModule, CommonModule, NgbTooltipModule, SafePipe]
})
export class VacationDetailsComponent {
    global = inject(GlobalService)
    parent = inject(VacationGuardComponent)

    onApprove = () => {
        if (this.parent.current) {
            this.parent.current.approve().subscribe(() => {
                // Reload the vacation to get updated state
                this.parent.reload()
            })
        }
    }

    onDeny = () => {
        if (this.parent.current) {
            this.parent.current.input($localize`:@@i18n.confirm.pleaseSpecifyAReason:please specify a reason:`).then(reason => {
                if (reason !== null && reason !== undefined) {
                    this.parent.current!.deny(reason.text).subscribe(() => {
                        // Reload the vacation to get updated state
                        this.parent.reload()
                    })
                }
            })
        }
    }
}
