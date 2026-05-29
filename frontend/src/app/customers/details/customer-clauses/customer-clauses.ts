import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'customer-clauses',
    templateUrl: './customer-clauses.html',
    styleUrls: ['./customer-clauses.scss'],
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerClauses {}
