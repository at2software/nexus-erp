import { NxActionType } from "@app/nx/nx.actions"
import { NxGlobal } from "@app/nx/nx.global"
import { i18n1Week, i18nNWeeks, i18n1Month, i18nNMonths } from "@constants/i18n.constants"
import { Company } from "@models/company/company.model"
import { ConnectionProjects } from "@models/company/connection-projects.model"
import { CompanyContact } from '@models/company/company-contact.model';
import { VcardRow } from '@models/vcard/VcardRow';
import { Project } from "./project.model"
import { ModalInputComponent } from "@app/_modals/modal-input/modal-input.component"

const POSTPONE_DURATIONS = [
    { title: i18n1Week, duration: 1 },
    { title: i18nNWeeks(2), duration: 2 },
    { title: i18n1Month, duration: 3 },
    { title: i18nNMonths(2), duration: 4 },
    { title: i18nNMonths(3), duration: 5 },
    { title: i18nNMonths(6), duration: 6 },
    { title: i18nNMonths(12), duration: 7 },
]

export const getProjectActions = (self: any) => [
        { title: $localize`:@@i18n.common.open:open`, action: () => self.navigate(self.frontendUrl()) },
        {
            title: $localize`:@@i18n.common.addToClipboard:add to clipboard`,
            group: true,
            action: () => NxGlobal.clip(self)
        },
        {
            title: $localize`:@@i18n.common.removeFromClipboard:remove from clipboard`,
            group: true,
            on: (): boolean => NxGlobal.hasClip(self),
            action: () => NxGlobal.unclip(self)
        },
        {
            title: $localize`:@@i18n.common.makeRootProject:make root project`,
            group: true,
            on: (): boolean => self.project_id ? true : false,
            action: () => self.update({project_id: null}).subscribe()
        },
        {
            title: $localize`:@@i18n.common.setState:set state`, 
            group: true, 
            children: () => NxGlobal.global.getAllowedSucceedingProjectStatesFor(self).map(state => (
                { title: state.name, group: true, action: () => self.setState({ state: state.id }) }
            ))
        },
        {
            title: $localize`:@@i18n.project.extendReminder:extend reminder`, 
            on:()=>''+NxGlobal.global.user?.getParam('PROJECTS_POSTPONE_WITH_COMMENT') !== "1", 
            group: true, 
            children: () => POSTPONE_DURATIONS.map(({ title, duration }) => ({
                title,
                group: true,
                action: () => self.postpone(duration)
            }))
        },
        {
            title: $localize`:@@i18n.project.extendReminder:extend reminder`, 
            on:()=>''+NxGlobal.global.user?.getParam('PROJECTS_POSTPONE_WITH_COMMENT') === "1", 
            group: true, 
            children: () => {
                return POSTPONE_DURATIONS.map(({ title, duration }) => ({
                    title: title + ' 💬',
                    group: true,
                    interrupt: { service: ModalInputComponent, args: { title: $localize`:@@i18n.project.postponeComment:Comment for postponing` } },
                    action: () => self.postpone(duration, undefined, NxGlobal.nxService.interruptResult.text)
                }))
            }
        },
        // Project manager
        {
            title: $localize`:@@i18n.project.setProjectManager:set project manager`,
            on:()=>!self.project_manager_id,
            group: true,
            children: NxGlobal.global.team.filter(_ => !_.is_retired && (_.role_names.includes('project_manager') || _.role_names.includes('admin'))).map(user => ({
                title: user.getName(),
                group: true,
                action: () => self.update({ project_manager_id: user.id }).subscribe()
            }))
        },
        {
            title: $localize`:@@i18n.project.addParticipant:add participant...`,
            group: true,
            on: ():boolean => {
                const currentRoot = NxGlobal.getCurrentRoot()
                if (!currentRoot) return false
                const company = currentRoot instanceof Company ? currentRoot : currentRoot instanceof Project ? currentRoot.company : null
                if (!company) return false
                return (company?.available_connections?.length ?? 0) > 0
            },
            children: () => {                
                const currentRoot = NxGlobal.getCurrentRoot()
                if (!currentRoot) return []
                const company = currentRoot instanceof Company ? currentRoot : currentRoot instanceof Project ? currentRoot.company : null
                return (company?.available_connections ?? []).map((connection: ConnectionProjects) => ({
                    title: connection.other_company.name,
                    group: true,
                    action: () => self.addParticipant(connection.connection_id)
                }))
            }
        },
        {
            title: $localize`:@@i18n.common.selectAll:select all...`, children: [
                { title: $localize`:@@i18n.common.ofCustomer:...of customer`, unselectsingleActionResolved:false, hotkey: 'CTRL+ALT+C', action: () => self.nxSelect((_: Project) => _.company_id == self.company_id) }
            ]
        },
        {
            title: $localize`:@@i18n.project.removeFromWidget:remove from widget`,
            context: 'widgetPreparedInvoices',
            action: () => self.confirm('do you really want to ignore this project from invoice preparation?').then(() => self.update({is_ignored_from_prepared: true}).subscribe()),
            group: true,
            type: NxActionType.Destructive,
            roles: 'admin'
        },
        {
            title: 'Contact...',
            group: true,
            on: () => getContactActions(self).length > 0,
            children: () => getContactActions(self)
        },
        ...self.markerActions(),
        {
            title: $localize`:@@i18n.common.delete:delete`,
            action: () => self.confirm().then(() => self.delete().subscribe()),
            group: true,
            type: NxActionType.Destructive,
            hotkey: 'CTRL+DELETE',
            roles: 'admin'
        },
    ]

function getContactActions(self: any): any[] {
    const contacts: CompanyContact[] = self.assigned_contacts ?? [];
    const projectName: string = self.name;
    console.log('Assigned contacts:', contacts);
    return contacts.flatMap((cc: CompanyContact) => {
        const actions: any[] = [];
        const name: string = cc.getName() || cc.contact.card?.name || 'Contact';
        // Phone numbers
        (cc.card?.get('TEL') ?? []).forEach((p: VcardRow) => {
            actions.push({
                title: `Call ${name}`,
                group: true,
                action: () => window.open(`tel:${p.val().replace(/\s|,|\/-/g, '')}`)
            });
            if (typeof p.isMobile === 'function' && p.isMobile()) {
                actions.push({
                    title: `Whatsapp message ${name}`,
                    group: true,
                    action: () => window.open(`https://web.whatsapp.com/send/?phone=${p.val().replace(/\s|,|\/-/g, '').replace(/^\+/g, '')}&text&type=phone_number&app_absent=0`, 'whatsappweb')
                });
            }
        });
        // Email addresses
        (cc.card?.get('EMAIL') ?? []).forEach((p: VcardRow) => {
            actions.push({
                title: `Email ${name}`,
                group: true,
                action: () => window.open(`mailto:${p.val()}?subject=${encodeURIComponent(projectName)}`)
            });
        });
        return actions;
    });
}