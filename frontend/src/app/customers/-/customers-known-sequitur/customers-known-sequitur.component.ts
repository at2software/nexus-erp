import { CommonModule } from '@angular/common';
import { Component, inject, AfterViewInit, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { CustomerQuickstatsComponent } from '@app/customers/_shards/customer-quickstats/customer-quickstats.component';
import { ListGroupItemContactComponent } from '@app/customers/_shards/list-group-item-contact/list-group-item-contact.component';
import { CustomerDetailGuard } from '@app/customers/customers.details.guard';
import { NexusModule } from '@app/nx/nexus.module';
import { ActionEmitterType } from '@app/nx/nx.directive';
import { NxGlobal } from '@app/nx/nx.global';
import { LineChartRangeComponent } from '@charts/chart-card-base/chart-card-range.component';
import { Comment } from '@models/comment/comment.model';
import { Company } from '@models/company/company.model';
import { CompanyService } from '@models/company/company.service';
import { Connection } from '@models/company/connection.model';
import { Project } from '@models/project/project.model';
import { ProjectService } from '@models/project/project.service';
import { VcardRow } from '@models/vcard/VcardRow';
import { NgbPopoverModule, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { InputModalService } from '@app/_modals/modal-input/modal-input.component';
import { RteComponent } from '@shards/rte/rte.component';
import { SearchInputComponent } from '@shards/search-input/search-input.component';
import { UlCompactComponent } from '@shards/ul-compact/ul-compact.component';
import moment from 'moment';
import { forkJoin, Observable, of, switchMap } from 'rxjs';
import { HotkeyDirective } from '@directives/hotkey.directive';
import { MoneyPipe } from 'src/pipes/money.pipe';
import { AssignmentService } from '@models/assignee/assignment.service';
import { User } from '@models/user/user.model';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import { GlobalService } from '@models/global.service';
import { ActivityService } from '@app/_activity/activity.service';
import { Serializable } from '@models/serializable';
import { SafePipe } from 'src/pipes/safe.pipe';
import { VcardComponent } from '@app/customers/_shards/vcard/vcard.component';
import { MediaPreviewComponent } from '@app/projects/id/project-media/media-preview/media-preview.component';

@Component({
    selector: 'customers-known-sequitur',
    templateUrl: './customers-known-sequitur.component.html',
    styleUrls: ['./customers-known-sequitur.component.scss'],
    standalone: true,
    imports: [ToolbarComponent, ListGroupItemContactComponent, NexusModule, NgbPopoverModule, NgbDropdownModule, SearchInputComponent, CommonModule, LineChartRangeComponent, VcardComponent, CustomerQuickstatsComponent, EmptyStateComponent, UlCompactComponent, FormsModule, HotkeyDirective, MoneyPipe, MediaPreviewComponent, AvatarComponent, RteComponent, SafePipe]
})
export class CustomersKnownSequiturComponent implements AfterViewInit, OnInit {

    parent = inject(CustomerDetailGuard)
    #companyService = inject(CompanyService)
    #projectService = inject(ProjectService)
    #inputModalService = inject(InputModalService)
    #assignmentService = inject(AssignmentService)
    #global = inject(GlobalService)
    #activityService = inject(ActivityService)
    customer: Company
    noCustomerFound: boolean = false
    projects: Project[] = []
    notes: Comment[] = []
    connections: Connection[] = []
    selectedItem: any = null

    // Helper to compare items by their API path
    isSameItem = (a: any, b: any) => a?.getApiPathWithId?.() === b?.getApiPathWithId?.()


    ngOnInit() {
        this.parent.onChange.subscribe(() => {
            this.setCustomer(this.parent.current)
        })
    }

    ngAfterViewInit() {
        // Focus on the comments tab when knownseq component appears
        setTimeout(() => {
            const commentsTab = this.#activityService.tabs.find(tab => tab.icon() === 'chat');
            if (commentsTab) {
                commentsTab.focus();
            }
        }, 100);
    }

    onSearchResultSelect(_: any) {
        let customerId = "";
        switch (_.class) {
            case 'Company': customerId = _.id; break;
            case 'CompanyContact': customerId = _.company.id; break;
        }
        if (customerId != "") this.#companyService.show(customerId).subscribe(_ => this.setCustomer(_))
    }

    onAssignmentActions = (_e?: ActionEmitterType) => {
        this.#companyService.show(this.customer!.id).subscribe(_ => this.customer!.employees = _.employees)
    }

    setCustomer(company: Company) {
        this.customer = company
        this.noCustomerFound = false;
        this.#projectService
            .indexForCompany(company)
            .subscribe((p) => this.onQuickLinksLoaded(p))
        this.#companyService.showConnections(this.parent.current).subscribe(data => {
            this.connections = data
            this.connections.forEach(_ => _.addCompanyAction(_.otherCompany(this.parent.current)))
        })
        const commentData = {
            path: this.customer.getApiPathWithId(),
            parent: this.customer
        };
        const note = Comment.fromJson(commentData)
        note.parent = this.customer
        note.var.active = true
        this.notes = [note]
    }

    onQuickLinksLoaded(p: Project[]) {
        this.projects = p
    }

    selectItem(item: Serializable, event?: Event): void {
        if (event) event.stopPropagation()

        if (item instanceof Connection) {
            if (item.company1.id == this.customer.id) item = item.company2
            else if (item.company2.id == this.customer.id) item = item.company1
        }
        const index = this.notes.findIndex(note => this.isSameItem(note, item))
        this.notes.forEach(_ => _.var.active = false)

        if (index > -1) {
            const [note] = this.notes.splice(index, 1)
            note.var.active = true
            this.notes.unshift(note)
        } else {
            let text = ''
            if (item instanceof Project) text = item.description
            const commentData = {
                path: item.getApiPathWithId(),
                text: text
            };
            const note = Comment.fromJson(commentData)
            note.parent = item
            note.var.active = true
            this.notes.unshift(note)
        }

        this.selectedItem = item;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    replaceSlashes(_: string) {
        return _.replace('/', '_')
    }

    removeNote(item: Serializable) {
        const index = this.notes.findIndex(_ => this.isSameItem(_, item));
        this.notes.splice(index, 1);
    }

    getItem(item: Serializable): any {
        // If item has a _parent, return it directly
        const itemAsAny = item as any;
        if (itemAsAny._parent) return itemAsAny._parent;

        let index: number = this.projects.findIndex(_ => this.isSameItem(_, item));
        if (index > -1) return this.projects[index];

        index = this.customer?.employees.findIndex(_ => this.isSameItem(_, item));
        if (index > -1) return this.customer?.employees[index];

        index = this.connections?.findIndex(_ => (!this.isSameItem(_.company1, this.customer) && this.isSameItem(_.company1, item)) || (!this.isSameItem(_.company2, this.customer) && this.isSameItem(_.company2, item)));
        if (index > -1) {
            const con = this.connections[index];
            if (this.isSameItem(con.company1, item)) return con.company1;
            return con.company2
        }
        return this.customer;
    }

    createProject = (event: Event) => {
        event.stopPropagation()
        this.#inputModalService.open($localize`:@@i18n.customers.project_name:Project name`).confirmed(({ text }) => {
            this.#projectService.addProject(this.customer!.id, text).subscribe((x: any) => this.projects.push(x))
        })
    }

    createSubProject = (event: Event, parentProject: Project) => {
        event.stopPropagation()
        this.#inputModalService.open($localize`:@@i18n.customers.project_name:Project name`).confirmed(({ text }) => {
            this.#projectService.post(`companies/${this.customer!.id}/projects`, { name: text, project_id: parentProject.id }).subscribe((x: any) => this.projects.push(x))
        })
    }

    createContact = () => {
        this.#companyService.createEmployee(this.customer!.id).subscribe(() => this.parent.reload())
    }

    createCompany = () => {
        this.#inputModalService.open($localize`:@@i18n.customers.company_name:company name`).confirmed(({ text }) => {
            this.#companyService.create(text).subscribe((x: any) => {
                this.onCompanySelect(x)
            })
        })
    }

    onCompanySelect(x: Company) {
        Connection.fromJson({
            company1_id: this.customer.id,
            company2_id: x.id,
        }).store().subscribe(_ => {
            this.connections.push(Connection.fromJson(_))
        })
    }

    asProject = (_: any) => _ as Project
    birthdayMissing = (item: any) => this.isInstanceOf(item, 'CompanyContact') && !item.contact?.card.get('BDAY').length;
    linkedinMissing = (item: any) => this.isInstanceOf(item, 'CompanyContact') && !item.contact?.card.get('URL').filter((row: VcardRow) => row.getType() == 'linkedin').length;

    webUrlMissing = (item: any) => this.isInstanceOf(item, 'Company') && item.card.get('URL').every((row: VcardRow) => row.isSocialMedia());
    commercialRegisterNumberMissing = (item: any) => this.isInstanceOf(item, 'Company') && (item.name.includes('GmbH') || item.name.includes('AG')) && !item.commercial_register;

    isCompanyContact(item: any) {
        return this.isInstanceOf(item, 'CompanyContact');
    }
    isInstanceOf(item: any, className: string) {
        return item?.class == className
    }

    saveComments() {
        const subs: Observable<any>[] = []
        this.notes.forEach(note => {
            if (note.text != null && note.text != "") {
                const item = this.getItem(note);
                if (item instanceof Project) {
                    item.description = note.text;
                    subs.push(item.update({ description: item.description }).pipe(
                        switchMap(_ => {
                            const index: number = this.projects.findIndex(p => p.id === _.id);
                            if (index > -1) this.projects[index].description = _;
                            return of(null)
                        }))
                    )
                } else {
                    const data = {
                        text: note.text,
                        type: note.type,
                        path: note.getApiPathWithId()
                    };
                    if (note.id) {
                        subs.push(note.update(data).pipe(
                            switchMap(_ => {
                                const index = this.notes.findIndex(note => this.isSameItem(note, _))
                                if (index > -1) this.notes[index] = _
                                return of(null)
                            }))
                        )
                    } else {
                        subs.push(note.store(data).pipe(
                            switchMap(_ => {
                                const index = this.notes.findIndex(note => this.isSameItem(note, _))
                                if (index > -1) {
                                    const text = this.notes[index].text
                                    this.notes[index] = _
                                    this.notes[index].text = text
                                }
                                return of(null)
                            }))
                        )
                    }
                }
            }
        })
        if (subs.length > 0) {
            forkJoin(subs).subscribe(() => {
                this.notes.forEach(note => {
                    this.getItem(note)
                })
            });
        }
    }

    autoExpand(element: HTMLTextAreaElement) {
        element.style.height = 'auto';
        element.style.height = element.scrollHeight + 'px';
    }

    onKeyDown(event: KeyboardEvent, project: Project, textareaElement: HTMLTextAreaElement) {
        if (event.key === 'Enter' && event.ctrlKey) {
            event.preventDefault();
            this.addProjectComment(project, textareaElement);
        }
    }

    addProjectComment(project: Project, textareaElement: HTMLTextAreaElement) {
        const comment = textareaElement.value.trim();
        if (!comment) return;

        const now = moment().format('YYYY-MM-DD HH:mm');
        const userName = NxGlobal.global.user?.name || 'Unknown User';
        
        // Convert newlines to <br> tags
        const formattedComment = comment.replace(/\n/g, '<br>');
        const newCommentText = `<br><br><code>${now} - ${userName}</code> ${formattedComment}`;
        
        // Add the comment to the project description
        project.description = (project.description || '') + newCommentText;
        
        // Update the project
        project.update({ description: project.description }).subscribe(_ => {
            // Update the project in the local array
            const index = this.projects.findIndex(p => p.id === project.id);
            if (index > -1) {
                this.projects[index].description = project.description;
            }
        });

        // Clear the textarea and reset height
        textareaElement.value = '';
        textareaElement.style.height = 'auto';
    }

    // User Assignment Methods for individual items
    availableUsersForItem(item: any): User[] {
        const assignedUserIds = item.assignees?.map((a: any) => a.assignee.id) || [];
        return this.#global.team.filter((user: User) => !assignedUserIds.includes(user.id));
    }

    addUserToItem(item: any, user: User) {
        if (this.isInstanceOf(item, 'Company')) {
            this.#assignmentService.addToCompany(item, { id: user.id, class: 'user' })
                .subscribe(response => {
                    if (!item.assignees) {
                        item.assignees = [];
                    }
                    item.assignees.push(response);
                });
        } else if (this.isInstanceOf(item, 'Project')) {
            this.#assignmentService.addToProject(item, { id: user.id, class: 'user' })
                .subscribe(response => {
                    if (!item.assignees) {
                        item.assignees = [];
                    }
                    item.assignees.push(response);
                });
        }
    }

}
