import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DocumentDashboardComponent } from './document-dashboard/document-dashboard.component';

@NgModule({
  declarations: [],
  imports: [
  ]
})
export class DocumentsSharedModule { }

@NgModule({
  declarations: [],
  imports: [RouterModule.forChild([
    { path: '', component: DocumentDashboardComponent },
  ]), DocumentsSharedModule]
})
export class DocumentsModule { }