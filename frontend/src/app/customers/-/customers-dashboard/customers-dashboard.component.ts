import { Router } from '@angular/router';
import { Component, inject, OnInit, AfterViewInit } from '@angular/core';
import { CompanyService } from '@models/company/company.service';
import { ProductService } from '@models/product/product.service';
import { Observable } from 'rxjs';
import { span, StartEnd } from '@constants/constants';
import { DATESPAN_RANGE } from '@constants/dateSpanRange';
import moment from 'moment';
import { Company } from '@models/company/company.model';
import { Project } from '@models/project/project.model';
import { Product } from '@models/product/product.model';
import { SortData } from '@app/app/table-controls/sort-data';
import { SortMode } from '@app/app/table-controls/sort-mode';
import { InputModalService } from '@app/_modals/modal-input/modal-input.component';
import { HttpHeaders } from '@angular/common/http';
import { GlobalService } from '@models/global.service';
import { TableSearchSortBase } from '@app/app/table-controls/table-base/table-search-sort-base.component';
import { ProjectState } from '@models/project/project-state.model';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { CdkTableModule } from '@angular/cdk/table';
import { NexusModule } from '@app/nx/nexus.module';
import { MoneyPipe } from '../../../../pipes/money.pipe';
import { ContinuousMarkerComponent } from '@shards/continuous/continuous.marker.component';
import { FormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { ProjectComponent } from '@shards/project/project.component';
import { NgxDaterangepickerMd } from 'ngx-daterangepicker-material';
import { SearchInputComponent } from '@shards/search-input/search-input.component';
import { EnableTableExportDirective } from '@app/app/table-controls/enable-table-export.directive';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { GuidedTourComponent } from '@shards/guided-tour/guided-tour.component';

@Component({
    selector: 'customers-dashboard',
    templateUrl: './customers-dashboard.component.html',
    styleUrls: ['./customers-dashboard.component.scss'],
    standalone: true,
    imports: [ToolbarComponent, EnableTableExportDirective, CdkTableModule, NexusModule, MoneyPipe, ContinuousMarkerComponent, FormsModule, CommonModule, DatePipe, ProjectComponent, NgxDaterangepickerMd, SearchInputComponent, EmptyStateComponent, GuidedTourComponent]
})
export class CustomersDashboardComponent extends TableSearchSortBase<Company> implements OnInit, AfterViewInit {
    protected getItems(): Company[] {
      return this.companies;
    }
    
    // Static permission computed on init for performance
    hasInvoicesModule: boolean = false
    
    displayedColumns = ['created_at', 'icon', 'name', 'projects']

    hasLoaded: boolean = false
    companies: Company[] = []
    products: Product[] = []

    // Existing filters
    revenueOn: boolean = false
    onlyWithActiveProjects: boolean = true
    revenueSpan: StartEnd
    selUpdated: StartEnd
    revenueMin: number = 0

    // New filter toggles
    dateRangeFilterActive: boolean = false
    updatedAtFilterActive: boolean = false
    revenueFilterActive: boolean = false
    productFilterActive: boolean = false

    // Filter values
    dateRange?: { startDate: any, endDate: any }
    updatedAtRange?: { startDate: any, endDate: any }
    revenue_min?: number
    selectedProduct?: Product

    ranges: any = DATESPAN_RANGE
    updatedAtRanges: any = {}
    loadsum: number = 0
    global = inject(GlobalService)

    observer: Observable<Company[]>
    onResult = (x: Company[]) => {
        this.hasLoaded = true
        this.companies = this.companies.concat(x)
        this.refreshItems()
    }

    #companyService   : CompanyService    = inject(CompanyService)
    #productService   : ProductService    = inject(ProductService)
    #router           : Router            = inject(Router)
    #inputModalService: InputModalService = inject(InputModalService)

    ngOnInit() {
        // Compute static roles once to avoid repeated hasRole() calls in template
        this.hasInvoicesModule = this.global.user?.hasRole('invoicing') ?? false
        if (this.hasInvoicesModule) {
            this.displayedColumns.push('revenue')
        }

        // Load products for dropdown
        this.#productService.index().subscribe(products => {
            this.products = products
        })

        // Create preset ranges for updated_at filter
        this.updatedAtRanges = {
            ...DATESPAN_RANGE, // Include standard ranges
            'Before 1 Year': [moment('1900-01-01'), moment().subtract(1, 'years')],
            'Before 2 Years': [moment('1900-01-01'), moment().subtract(2, 'years')],
            'Before 3 Years': [moment('1900-01-01'), moment().subtract(3, 'years')],
            'Before 5 Years': [moment('1900-01-01'), moment().subtract(5, 'years')],
            'Before 10 Years': [moment('1900-01-01'), moment().subtract(10, 'years')]
        }
    }

    filtersUpdated = (_e?: any) => {
        const filters: any = Object.assign({}, this.filters())
        this.companies = []
        this.hasLoaded = false
        setTimeout(() => this.observer = this.#companyService.index(filters), 10)
    }

    filters = () => {
        const filters: any = {
            onlyWithActiveProjects: this.onlyWithActiveProjects,
            revenueOn: this.revenueOn,
            revenueSpan: span(this.revenueSpan),
            revenueMin: this.revenueMin
        };

        // Add date range filter if active
        if (this.dateRangeFilterActive && this.dateRange) {
            if (this.dateRange.startDate) filters.created_from = this.dateRange.startDate.format('YYYY-MM-DD');
            if (this.dateRange.endDate) filters.created_to = this.dateRange.endDate.format('YYYY-MM-DD');
        }

        // Add updated_at filter if active
        if (this.updatedAtFilterActive && this.updatedAtRange) {
            if (this.updatedAtRange.startDate) filters.updated_from = this.updatedAtRange.startDate.format('YYYY-MM-DD');
            if (this.updatedAtRange.endDate) filters.updated_to = this.updatedAtRange.endDate.format('YYYY-MM-DD');
        }

        // Add revenue filter if active
        if (this.revenueFilterActive && this.revenue_min !== undefined) {
            filters.revenue_min = this.revenue_min;
        }

        // Add product filter if active
        if (this.productFilterActive && this.selectedProduct) {
            filters.product_id = this.selectedProduct.id;
        }

        // Add sorting parameters
        if (this.sortData.sortMode !== SortMode.NONE) {
            filters.sort_by = this.sortData.key;
            filters.sort_direction = this.sortData.sortMode === SortMode.ASCENDING ? 'asc' : 'desc';
        }
        return filters;
    };

    ngAfterViewInit(): void { this.filtersUpdated(null) }

    onProductSelect = (product: Product) => {
        this.selectedProduct = product
        this.filtersUpdated(null)
    }

    // Override sorting to use backend API instead of client-side sorting
    override sortBy(sortData: SortData): void {
        this.sortData = sortData
        this.filtersUpdated(null)
    }

    // Override refresh to prevent client-side sorting
    override refreshItems(): void {
        this.sortedItems = this.companies
    }

    // Manual sort header click handler
    sortByColumn(column: string): void {
        // Toggle sort mode for the same column
        if (this.sortData.key === column) {
            this.sortData.sortMode = this.sortData.sortMode === SortMode.ASCENDING
                ? SortMode.DESCENDING
                : this.sortData.sortMode === SortMode.DESCENDING
                    ? SortMode.NONE
                    : SortMode.ASCENDING;
        } else {
            // New column, start with ascending
            this.sortData.key = column;
            this.sortData.sortMode = SortMode.ASCENDING;
        }

        this.filtersUpdated(null);
    }

    // Get sort icon for column
    getSortIcon(column: string): string {
        if (this.sortData.key !== column) return '';

        switch (this.sortData.sortMode) {
            case SortMode.ASCENDING: return '↑';
            case SortMode.DESCENDING: return '↓';
            default: return '';
        }
    }

    bubbleSizeFor = (p: Project) => {
        if (p.net < 1000) return 'bubble-sm'
        if (p.net < 10000) return 'bubble-md'
        if (p.net < 100000) return 'bubble-lg'
        return 'bubble-xl'
    }
    bubbleColorFor = (p: Project): string => {
        if (p.state.progress == ProjectState.ProgressPrepared) return 'bubble-darker'
        if (p.is_time_based) return 'bubble-time'
        return 'bubble-active'
    }

    httpOptions: any = {
        headers: new HttpHeaders({
            'Access-Control-Allow-Origin': '*',
        })
    }
    create = () => {
        this.#inputModalService.open($localize`:@@i18n.customers.company_name_or_url:Company name or URL`).confirmed(({ text }) => {
            this.#companyService.create(text).subscribe(x => {
                this.#router.navigate(['/customers/' + x.id + '/cards'])
            })
        })
    }

}
