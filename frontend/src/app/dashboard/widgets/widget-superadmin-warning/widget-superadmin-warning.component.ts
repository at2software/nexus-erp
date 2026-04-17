import { Component, inject, OnInit } from '@angular/core';
import { User } from 'src/models/user/user.model';
import { GlobalService } from 'src/models/global.service';


@Component({
    selector: 'widget-superadmin-warning',
    templateUrl: './widget-superadmin-warning.component.html',
    standalone: true,
    imports: []
})
export class WidgetSuperadminWarningComponent implements OnInit {

    #global = inject(GlobalService)

    superadmin: User | undefined
    loading = false

    ngOnInit() {
        this.superadmin = this.#global.teamAll?.find((u: any) => u.getName() === 'Super Admin') as User | undefined
    }

    retire() {
        if (!this.superadmin || this.loading) return
        this.loading = true
        this.superadmin.delete().subscribe({
            next: () => {
                this.superadmin = undefined
                this.loading = false
            },
            error: () => { this.loading = false }
        })
    }
}
