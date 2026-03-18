import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, Input } from "@angular/core";
import { NexusModule } from "@app/nx/nexus.module";
import { SmartLinkDirective } from "@directives/smart-link.directive";
import { Company } from "@models/company/company.model";
import { InvoiceItem } from "@models/invoice/invoice-item.model";
import { NgbTooltipModule } from "@ng-bootstrap/ng-bootstrap";
import { Color } from "@constants/Color";
import { NComponent } from "@shards/n/n.component";

@Component({
    selector: '[tr-annotation]',
    templateUrl: './tr-annotation.component.html',
    host: { class: 'annotate annotate-left' },
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [NexusModule, CommonModule, NgbTooltipModule, SmartLinkDirective, NComponent]
})
export class TableRowAnnotationComponent {
    @Input() item:InvoiceItem
    @Input() text:string = ''
    @Input() company?:Company
    @Input() mode: 'quote' | 'invoice' | 'support' = 'invoice'

    // Quote-specific prediction logic
    #COL_CENTER = 140
    avg  = () => Math.round(10 * (this.item.predictions?.length ? this.item.predictions.reduce((a, b)=>a + b.qty, 0) / this.item.predictions.length : this.item.qty)) / 10
    diff = () => (this.avg() - this.item.qty) / this.item.qty
    iCol = () => this.#COL_CENTER - this.#COL_CENTER * Math.min(1, Math.max(-1, this.diff()))
    col  = () => Color.fromHsl(this.iCol(), 100, 60).toHexString()

    // Support-specific foci tracking logic
    fociPercentage = () => this.item.qty / (this.item.billed_foci_sum_duration || 1)
    fociColor = () => {
        const percentage = this.fociPercentage()
        // Map 0-60% to red (0°), 60-100% to green (120°)
        const hue = percentage <= 0.6 ? 0 : ((percentage - 0.6) / 0.4) * 120
        return Color.fromHsl(hue, 100, 50).toHexString()
    }
}