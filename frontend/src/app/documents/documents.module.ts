import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DocumentDashboardComponent } from './document-dashboard/document-dashboard.component';

@NgModule({
    declarations: [],
    imports: [RouterModule.forChild([{ path: '', component: DocumentDashboardComponent }])],
})
export class DocumentsModule {}
