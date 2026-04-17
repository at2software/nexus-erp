import { Component, inject, input } from '@angular/core';
import { Contact } from '@models/company/contact.model';
import { ContactService } from '@models/company/contact.service';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';


@Component({
    selector: 'at2connect',
    templateUrl: './at2connect.html',
    styleUrls: ['./at2connect.scss'],
    standalone: true,
    imports: [NgbTooltipModule]
})
export class At2connect {

  contact = input.required<Contact>()
  
  qrCode?: string;

  cService: ContactService = inject(ContactService);

  createAt2ConnectToken = () => this.cService.createAt2ConnectToken(this.contact().id).subscribe(_ => this.contact().qr_code = _.qr_code);
  deleteAt2ConnectToken = () => this.cService.deleteAt2ConnectToken(this.contact().id).subscribe(_ => this.contact().qr_code = _.qr_code);
  openAt2Connect = () => window.open(this.contact().qr_code_content, "_blank")
}
