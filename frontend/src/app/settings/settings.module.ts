import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SettingsInvoicesComponent } from './invoices/settings-invoices.component';
import { SettingsGeneralComponent } from './general/settings-general.component';
import { SettingsNavComponent } from './settings-nav.component';
import { UsersComponent } from './roles/roles.component';
import { ConfirmationService } from '@app/_modals/modal-confirm/confirmation.service';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { SettingsProjectsComponent } from './settings-projects/settings-projects.component';
import { SettingsProjectsQuoteComponent } from './settings-projects/settings-projects-quote/settings-projects-quote.component';
import { SettingsProjectsLeadsComponent } from './settings-projects/settings-projects-leads/settings-projects-leads.component';
import { SettingsProjectsMilestonesComponent } from './settings-projects/settings-projects-milestones/settings-projects-milestones.component';
import { SettingsProjectsNotificationsComponent } from './settings-projects/settings-projects-notifications/settings-projects-notifications.component';
import { SettingsProjectsPaymentPlansComponent } from './settings-projects/settings-projects-payment-plans/settings-projects-payment-plans.component';
import { SettingsVaultComponent } from './settings-vault/settings-vault.component';
import { SettingsCommandsComponent } from './commands/settings-commands.component';

@NgModule({
  providers: [
    ConfirmationService
  ]
})
export class SettingsSharedModule { }

@NgModule({
  declarations: [],
  imports: [RouterModule.forChild([
    {
      path: '', component: SettingsNavComponent, children: [
        { 
            path: 'invoices', 
            component: SettingsInvoicesComponent, 
            canActivate: [PermissionsGuard], 
            data: { roles: "invoicing", fallback: ['settings'] }, 
            title: $localize`:@@i18n.settings.invoiceSettings:invoice settings` 
        },
        { 
            path: 'projects', 
            component: SettingsProjectsComponent, 
            canActivate: [PermissionsGuard],
            data: { roles: "project_manager", fallback: ['settings'] }, 
            children: [
              { path: 'general', component: SettingsProjectsNotificationsComponent },
              { path: 'quote', component: SettingsProjectsQuoteComponent },
              { path: 'payment-plans', component: SettingsProjectsPaymentPlansComponent },
              { path: 'leads', component: SettingsProjectsLeadsComponent },
              { path: 'milestones', component: SettingsProjectsMilestonesComponent },
              { path: '**', redirectTo: 'quote' },
            ],
            title: $localize`:@@i18n.settings.projectSettings:project settings` 
        },
        {
          path: 'vault', component: SettingsVaultComponent },
        {
          path: 'commands',
          component: SettingsCommandsComponent,
          canActivate: [PermissionsGuard],
          data: { roles: "admin", fallback: ['settings'] },
          title: $localize`:@@i18n.settings.commands:commands`
        },
        { 
            path: 'roles', 
            component: UsersComponent, 
            canActivate: [PermissionsGuard], 
            data: { roles: "admin", fallback: ['settings'] }, 
            title: $localize`:@@i18n.common.users:users`
        },
        { 
            path: '', 
            component: SettingsGeneralComponent, 
            title: $localize`:@@i18n.settings.generalSettings:general settings`,
        },
        { path: '**', redirectTo: '' },
      ]
    },
    { path: '**', redirectTo: '' },
  ]), SettingsSharedModule]
})
export class SettingsModule { }