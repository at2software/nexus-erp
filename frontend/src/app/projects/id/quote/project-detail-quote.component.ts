import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { InvoiceItem } from '@models/invoice/invoice-item.model';
import { VcardClass } from '@models/vcard/VcardClass';
import { Assignee } from '@models/assignee/assignee.model';
import { InvoicePrepare } from '@app/invoices/_shards/invoice-prepare/invoice-prepare';
import { PdfCreationType } from '../../../../enums/PdfCreationType';
import { ProjectService } from '@models/project/project.service';
import { CompanyContact } from '@models/company/company-contact.model';
import { AssignmentService } from '@models/assignee/assignment.service';
import { forkJoin, Observable } from 'rxjs';
import { ProjectDetailGuard } from '@app/projects/project-details.guard';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';

import { TextParamEditorComponent } from '@shards/text-param-editor/text-param-editor.component';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { SafePipe } from 'src/pipes/safe.pipe';

@Component({
    selector: 'project-detail-quote',
    templateUrl: './project-detail-quote.component.html',
    standalone: true,
    imports: [ToolbarComponent, ScrollbarComponent, TextParamEditorComponent, InvoicePrepare, NgbDropdownModule, SafePipe]
})
export class ProjectDetailQuoteComponent implements OnInit {

    personalized: VcardClass

    @ViewChild(InvoicePrepare) table:InvoicePrepare
    
    quoteDescriptions:string[] = []
    parent              = inject(ProjectDetailGuard)
    #assignmentService  = inject(AssignmentService)
    #projectService     = inject(ProjectService)

    ngOnInit(): void {
        this.parent.onChange.subscribe(() => {
            for (const o of this.parent.current.assignees) {
                if (o.company_contact_id) {
                    const m = Assignee.fromJson(o);
                    this.personalized = m.assignee
                }
            }
            this.quoteDescriptions = this.parent.current.quote_descriptions || []
        })
    }

    onMyPrediction() {
        const s:Observable<any>[] = []
        this.#iterateItems((_) => {
            if (_.type < 10 && _.qty != _.my_prediction) {
                _.qty = _.my_prediction ?? 0
                s.push(_.update({qty:_.qty}))
            }
        })
        forkJoin(s).subscribe()
    }
    onPredictionAverage() {
        const s:Observable<any>[] = []
        this.#iterateItems((_) => {
            if (_.type < 10 && _.qty != _.my_prediction) {
                if (_.predictions.length === 0) return
                const predictionAverage = Math.round(_.predictions.reduce((a,b) => a + b.qty, 0) / _.predictions.length)
                _.qty = predictionAverage
                s.push(_.update({qty:_.qty}))
            }
        })
        forkJoin(s).subscribe()
    }
    onAddCompanyContact(x: CompanyContact) {   
        this.#assignmentService.addToProject(this.parent.current, { id: x.id, class: 'company_contact' }).subscribe(() => this.parent.reload())
    }
    onQuote = () => this.#projectService.makePdf(this.parent.current, PdfCreationType.Create)

    warningMissingContact = () => this.parent.current?.personalized.firstName ? false : true
    adresseeName = () => { 
        const u = this.parent.current?.personalized; 
        return (u && u.firstName) ? `${u.salutation || ''} ${u.firstName} ${u.familyName || ''}`.trim() : $localize`:@@i18n.project.selectCompanyContact:select company contact`
    }

    #iterateItems = (fn:(x:InvoiceItem)=>void) => this.parent.current?.invoice_items.forEach(fn)
    
}
