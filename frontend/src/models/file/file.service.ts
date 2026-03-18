import { Injectable } from '@angular/core';
import { Invoice } from 'src/models/invoice/invoice.model';
import { NexusHttpService } from '../http/http.nexus';
import { File } from './file.model';
import { InvoiceReminder } from '../invoice/invoice-reminder.model';

@Injectable({
    providedIn: 'root'
})
export class FileService extends NexusHttpService<any> {
    public apiPath = 'files'
    public TYPE = () => File

    show(target: Invoice|InvoiceReminder|File): void {
        let url: string | undefined = undefined
        if (target instanceof Invoice) url = `invoices/${target.id}/pdf`
        if (target instanceof InvoiceReminder) url = `invoice_reminders/${target.id}/pdf`
        if (target instanceof File) url = `files/${target.id}`
        if (!url) { 
            return console.warn('type ' + typeof target + ' is not explicitely defined for file retrieval')
        }
        this.getFile(url!)
    }

    upload = (path:string, file:FormData) => this.post(path, file)
    uploadTravelExpenses = (files:FormData, success?:()=>void) => this.postBlob('users/travel-expenses', files, success)
}