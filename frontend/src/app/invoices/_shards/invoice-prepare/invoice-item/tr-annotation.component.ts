import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";
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
    item = input.required<InvoiceItem>()
    text = input('')
    company = input<Company>()
    mode = input<'quote' | 'invoice' | 'support'>('invoice')

    readonly #COL_CENTER = 140

    readonly avg = computed(() => {
        const item = this.item()
        return Math.round(10 * (item.predictions?.length
            ? item.predictions.reduce((a, b) => a + b.qty, 0) / item.predictions.length
            : item.qty)) / 10
    })

    readonly diff = computed(() => (this.avg() - this.item().qty) / this.item().qty)

    readonly col = computed(() => {
        const iCol = this.#COL_CENTER - this.#COL_CENTER * Math.min(1, Math.max(-1, this.diff()))
        return Color.fromHsl(iCol, 100, 60).toHexString()
    })

    readonly fociPercentage = computed(() => this.item().qty / (this.item().billed_foci_sum_duration || 1))

    readonly fociColor = computed(() => {
        const p = this.fociPercentage()
        const hue = p <= 0.6 ? 0 : ((p - 0.6) / 0.4) * 120
        return Color.fromHsl(hue, 100, 50).toHexString()
    })
}