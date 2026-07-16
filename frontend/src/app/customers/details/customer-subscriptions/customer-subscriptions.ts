import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'customer-subscriptions',
    templateUrl: './customer-subscriptions.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerSubscriptions {}
