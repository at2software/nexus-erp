import { Component, inject, OnInit } from '@angular/core';
import { InvoiceItemService } from '@models/invoice/invoice-item.service';
import { ProjectService } from '@models/project/project.service';
import { Project } from '@models/project/project.model';
import { InvoiceItem } from '@models/invoice/invoice-item.model';
import { Product } from '@models/product/product.model';
import { ProductService } from '@models/product/product.service';
import { InputModalService } from '@app/_modals/modal-input/modal-input.component';
import { ActivatedRoute } from '@angular/router';
import { GlobalService } from '@models/global.service';
import { User } from '@models/user/user.model';
import { Color } from '@constants/Color';
import { moveInvoiceItems } from '@app/invoices/_shards/invoice-prepare/invoice-item.reorder.const';
import { ProjectDetailGuard } from '@app/projects/project-details.guard';
import { PluginInstanceFactory } from '@models/http/plugin.instance.factory';
import { ModalBaseService } from '@app/_modals/modal-base-service';
import { MantisTargetVersionSelectionComponent } from '@app/_modals/mantis-target-version-selection/mantis-target-version-selection.component';
import { PluginLink } from '@models/pluginLink/plugin-link.model';
import { CommonModule } from '@angular/common';
import { CdkTableModule } from '@angular/cdk/table';
import { AutosaveDirective } from '@directives/autosave.directive';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { ProjectInfoComponent } from '@app/projects/_shards/project-info/project-info.component';
import { ChartProgressComponent } from '@charts/chart-progress/chart-progress.component';
import { Nx } from '@app/nx/nx.directive';
import { AffixInputDirective } from '@directives/affix-input.directive';
import { NComponent } from '@shards/n/n.component';
import { NgbDropdownModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';
import { PermissionsDirective } from '@directives/permissions.directive';
import { SafePipe } from '../../../../pipes/safe.pipe';
import { MediaPreviewComponent } from '../project-media/media-preview/media-preview.component';

type DisplayFieldType = 'qty' | 'my_prediction'

@Component({
    selector: 'project-planning',
    templateUrl: './project-planning.component.html',
    styleUrls: ['./project-planning.component.scss'],
    standalone: true,
    imports: [
        CommonModule, 
        CdkTableModule, 
        AutosaveDirective, 
        ToolbarComponent,
        MediaPreviewComponent,
        EmptyStateComponent,
        ProjectInfoComponent,
        ChartProgressComponent,
        FormsModule,
        Nx,
        AffixInputDirective,
        NComponent,
        NgbTooltipModule,
        CdkTableModule,
        CdkDropList,
        CdkDrag,
        PermissionsDirective,
        NgbDropdownModule,
        SafePipe,
    ]
})
export class ProjectPlanningComponent implements OnInit {

    #invoiceItemService = inject(InvoiceItemService)
    #projectService = inject(ProjectService)
    #global = inject(GlobalService)
    #input = inject(InputModalService)
    #route = inject(ActivatedRoute)
    #productService = inject(ProductService)
    parent = inject(ProjectDetailGuard)
    factory = inject(PluginInstanceFactory)
    #modal = inject(ModalBaseService)

    displayField: DisplayFieldType
    project: Project
    predictions: any[] = []
    predictionTotal: number = 0
    product: Product | undefined = undefined
    showPredictions:boolean = false

    ngOnInit() {
        this.#route.data.subscribe((_) => this.displayField = _.target)
        this.parent.onChange.subscribe(() => {
            this.project = this.parent.current
            this.#invoiceItemService.getInvoiceItems(this.parent.current, { append: 'my_prediction', with: 'predictions' }).subscribeAndMerge(this.parent.current, 'invoice_items')
            if (this.parent.current.product_id) {
                this.#productService.show(this.parent.current.product_id).subscribe((p: Product) => {
                    this.product = p
                })
            }
            this.updatePredictions()
        })
    }
    isRunning = () => this.displayField == 'qty'
    sumForMy = () => this.parent.current.invoice_items.reduce((a,b) => a + (b.my_prediction ?? 0), 0)
    sumFor = (u:User) => this.parent.current.invoice_items.reduce((a,b) => a + (b.predictions.find(_=>_.user_id == u.id)?.qty ?? 0), 0)
    sumForQty = () => this.parent.current.invoice_items.reduce((a,b) => a + b.qty, 0)
    predictionForUser = (p:InvoiceItem, u:User):number|undefined => p.predictions.find(_ => _.user_id == u.id)?.qty ?? undefined

    updatePredictions = () => {
        this.#projectService.predictionStats(this.project).subscribe((x: any) => {
            this.predictionTotal = x.total
            const predictions = 'predictions' in x ? x.predictions : []
            predictions.sort((_: any) => _.id)
            predictions.forEach((_:any) => _.user = User.fromJson(_.user));
            this.predictions = predictions
        })
    }    

    mean = (p:InvoiceItem) => p.predictions.length ? p.predictions.reduce((a,b) => a + b.qty, 0) / p.predictions.length : 0
    variance = (p:InvoiceItem) => {
        if (p.predictions.length == 0) return 0
        const mean = this.mean(p)
        const sqr = p.predictions.map(_ => Math.pow(_.qty - mean, 2))
        return Math.sqrt(sqr.reduce((a,b) => a + b) / p.predictions.length)
    }
    variance_wt = (p:InvoiceItem) => p.predictions.length ? this.variance(p) / this.mean(p) : 0
    variance_color = (p:InvoiceItem) => Color.fromHsl(120 - (40 * Math.log10(this.variance(p))), 100, 60).toHexString()
    variance_wt_color = (p:InvoiceItem) => Color.fromHsl(120 - (240 * this.variance_wt(p)), 100, 60).toHexString()
    getMantisPlugins = () => this.project.plugin_links.filter(_ => _.type === 'mantis')

    deletePredictions = (item: InvoiceItem) => item.deletePrediction().subscribe(() => this.updatePredictions())

    onNewHeader = () => this.#input.open('title', true).confirmed(({ text, more }) => {
        this.#newItem({ text: text, type: 20 })
        if (more) this.onNewHeader()
    })
    onNewItem = () => {
        const infoMessage = $localize`:@@i18n.project.newItemDefaultProductInfo:All items created here are assigned to the default product (see project settings).`
        this.#input.open('title', true, infoMessage).confirmed(({ text, more }) => {
            this.#newItem({ text: text, type: 0, product_source_id: this.product!.id })
            if (more) this.onNewItem()
        })
    }
    onImportFromMantis(link:PluginLink) {
        this.#modal.open(MantisTargetVersionSelectionComponent, this.factory.instanceFor(link))
    }
    onDrop = (e: any) => {
        const order = moveInvoiceItems(this.parent.current.invoice_items, e.previousIndex, e.currentIndex)
        this.#invoiceItemService.reorder(order).subscribe()
    }
    onUseAllPredictionsForUser(user:User) {
        this.parent.current.invoice_items.forEach(item => this.onPredictionAccept(item, user))
    }
    onPredictionAccept(item:InvoiceItem, user:User) {
        const pred = this.predictionForUser(item, user)!
        this.onAcceptPrediction(item, pred)
    }
    onAcceptPrediction(item:InvoiceItem, value:number) {
        item.update({qty: value}).subscribe(() => {
            item.qty = value!
        })
    }

    #newItem = (additional: any) => {
        const hUnit = this.#global.setting('INVOICE_HOUR_UNIT')
        const dUnit = this.#global.setting('INVOICE_DAY_UNIT')
        const wage:number = parseFloat(this.#global.setting('INVOICE_HOURLY_WAGE'))
        const hpd:number = parseFloat(this.#global.setting('INVOICE_HPD'))
        if (this.product) {
            const item = this.product?.getInvoiceItem() ?? {}
            if (item) {
                const pos = this.project.invoice_items.length ? Math.max(...this.project.invoice_items.map(_ => _.position)) + 1 : 0
                let modifiers:Record<string, any> = { project_id: this.project.id, qty: 0, position: pos }
                if (this.product.time_based == 1) modifiers = Object.assign(modifiers, { unit_name: hUnit, price: wage })
                if (this.product.time_based == hpd) modifiers = Object.assign(modifiers, { unit_name: dUnit, price: (wage * hpd) })
                modifiers = Object.assign(modifiers, additional)
                modifiers['product_id'] = null
                modifiers['invoice_item_predictions'] = null
                
                // Apply customer specific discount
                const company = this.project.company
                if (company?.getParam('INVOICE_DISCOUNT')) {
                    modifiers['discount'] = parseFloat(company.getParam('INVOICE_DISCOUNT') ?? '0')
                }
                if (company?.isVatExcempt) {
                    modifiers['vat_rate'] = 0
                }
                
                const item = InvoiceItem.fromJson(modifiers)
                item.store(item.getPrimitives(['my_prediction'])).subscribe((_) => { 
                    this.project.invoice_items.push(item) 
                })
            }
        }
    }
}
