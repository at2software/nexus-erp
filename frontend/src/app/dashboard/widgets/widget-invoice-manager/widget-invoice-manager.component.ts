import { Component, inject } from '@angular/core';

import { NgbTooltipModule, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { Project } from 'src/models/project/project.model';
import { Company } from 'src/models/company/company.model';
import { BaseWidgetComponent, WidgetOptions } from '../base.widget.component';
import { WidgetsModule } from '../widgets.module';
import { PermissionsDirective } from '@directives/permissions.directive';
import { WidgetService } from '@models/widget.service';
import { forkJoin } from 'rxjs';
import { REFLECTION } from 'src/constants/constants';
import { Router } from '@angular/router';

type TInvoiceItem = Project | Company
interface TGroupedItem {
    company: Company,
    items: { type: string, value: number, objects: TInvoiceItem[] }[]
}

@Component({
    selector: 'widget-invoice-manager',
    templateUrl: './widget-invoice-manager.component.html',
    styleUrls: ['./widget-invoice-manager.component.scss', './../base.widget.component.scss'],
    standalone: true,
    imports: [NgbTooltipModule, NgbDropdownModule, WidgetsModule, PermissionsDirective]
})
export class WidgetInvoiceManagerComponent extends BaseWidgetComponent {

    data: TInvoiceItem[] = []
    groupedData: TGroupedItem[] = []
    chartData: any[] = []
    #widgetService = inject(WidgetService)
    #router = inject(Router)

    defaultOptions = () => ({
        ...WidgetOptions.onlyMine,
        ...WidgetOptions.chartOnly,
    })

    reload(): void {
        if (!this.hasInvoicesExpenses) return

        const options = { ...this.getOptionsURI() }
        const chartOptions = { ...options }
        delete chartOptions['max-items']

        if (this.hasInvoicesModule) {
            chartOptions['withChart'] = '1'
        }

        // Load data from all three endpoints in parallel
        forkJoin({
            timebased: this.#widgetService.indexCashflow('PROJECTS_TIMEBASED', chartOptions, Project),
            support: this.#widgetService.indexCashflow('CUSTOMER_SUPPORT', chartOptions, Company),
            prepared: this.#widgetService.indexCashflow('INVOICES_PREPARED', chartOptions, Object)
        }).subscribe((responses: any) => {
            const timebased = (responses.timebased.objects || []).map((p: Project) => { p.var.itemType = 'timebased'; return p })
            const support = (responses.support.objects || []).map((c: Company) => { c.var.itemType = 'support'; return c })
            const prepared = (responses.prepared.objects || []).map((x: any) => {
                const c = REFLECTION(x)
                c.var.itemType = 'prepared'
                if (c instanceof Company) c.actions[0].action = () => c.navigate(`/customers/${c.id}/billing`)
                if (c instanceof Project) c.actions[0].action = () => c.navigate(`/projects/${c.id}/invoicing`)
                return c
            }).filter((a: any) => this.getAppliedValue(a) > 0)

            // Combine and sort by value
            this.data = [...timebased, ...support, ...prepared].sort((a, b) =>
                this.getAppliedValue(b) - this.getAppliedValue(a)
            )

            // Group by customer/company and aggregate by type
            const groupMap = new Map<string, TGroupedItem>()
            this.data.forEach(item => {
                const company = item instanceof Project ? item.company : item
                const companyId = company.id

                if (!groupMap.has(companyId)) {
                    groupMap.set(companyId, {
                        company: company,
                        items: []
                    })
                }

                const group = groupMap.get(companyId)!
                const itemType = item.var.itemType
                const itemValue = this.getAppliedValue(item)

                // Find existing item of same type and aggregate
                const existingItem = group.items.find(i => i.type === itemType)
                if (existingItem) {
                    existingItem.value += itemValue
                    existingItem.objects.push(item)
                } else {
                    group.items.push({
                        type: itemType,
                        value: itemValue,
                        objects: [item]
                    })
                }
            })

            // Convert map to array and sort by total value
            this.groupedData = Array.from(groupMap.values()).map(group => {
                // Sort items within each group by value (descending)
                group.items.sort((a, b) => b.value - a.value)

                // Aggregate all badge warnings from all objects in this group
                this.aggregateBadges(group)
                return group
            }).sort((a, b) => {
                const aTotal = a.items.reduce((sum, item) => sum + item.value, 0)
                const bTotal = b.items.reduce((sum, item) => sum + item.value, 0)
                return bTotal - aTotal
            })

            // Calculate total value in EUR (hours * hourly wage for timebased + support + prepared)
            const defaultWage = this.global.setting('HR_HOURLY_WAGE') ?? 0
            this.value = timebased.reduce((sum: number, p: Project) => sum + ((p.uninvoiced_hours || 0) * (p.target_wage || 0)), 0) +
                         support.reduce((sum: number, c: Company) => {
                            const wage = (c as any).individual_wage ?? defaultWage
                            return sum + ((c.foci_unbilled_sum_duration || 0) * wage)
                         }, 0) +
                         prepared.reduce((sum: number, item: TInvoiceItem) => sum + (item.net_remaining || 0), 0)

            // Combine chart data from all sources for stacked display
            const chartSeries = []
            if (responses.timebased.history) {
                chartSeries.push([responses.timebased.history].flat()[0])
            }
            if (responses.support.history) {
                chartSeries.push([responses.support.history].flat()[0])
            }
            if (responses.prepared.history) {
                chartSeries.push([responses.prepared.history].flat()[0])
            }
            if (chartSeries.length > 0) {
                this.chartData = chartSeries
            }
        })
    }

    isCompact = (item: TInvoiceItem): boolean => !item.badge

    getAppliedValue(item: TInvoiceItem): number {
        if (item.var.itemType === 'timebased' && item instanceof Project) return (item.uninvoiced_hours || 0) * (item.target_wage || 0)
        if (item.var.itemType === 'support' && item instanceof Company) {
            const wage = (item as any).individual_wage ?? this.global.setting('HR_HOURLY_WAGE') ?? 0
            return (item.foci_unbilled_sum_duration || 0) * wage
        }
        if (item.var.itemType === 'prepared') return item.net_remaining || 0
        return 0
    }

    getColorForType(type: string): string {
        if (type === 'timebased') return 'cyan'
        if (type === 'support') return 'cyan-teal'
        if (type === 'prepared') return 'teal'
        return 'grey'
    }

    getTooltipForType(type: string): string {
        if (type === 'timebased') return $localize`:@@i18n.widget.invoiceManager.timebased:time-based projects`
        if (type === 'support') return $localize`:@@i18n.common.customerSupport:customer support`
        if (type === 'prepared') return $localize`:@@i18n.common.preparedInvoices:prepared invoices`
        return ''
    }

    getTotalForGroup(group: TGroupedItem): number {
        return group.items.reduce((sum, item) => sum + item.value, 0)
    }

    isCompactGroup(group: TGroupedItem): boolean {
        // After aggregateBadges, company.badge will be set if any objects have badges
        return !group.company.badge
    }

    onBadgeClick(group: TGroupedItem, item: { type: string, value: number, objects: TInvoiceItem[] }, event: Event): void {
        if (item.type === 'prepared') {
            event.stopPropagation()
            this.#router.navigate(['/customers', group.company.id, 'billing'])
        } else if (item.type === 'support') {
            event.stopPropagation()
            this.#router.navigate(['/customers', group.company.id, 'support'])
        }
        // timebased handled by dropdown
    }

    getTimebasedProjects(group: TGroupedItem): Project[] {
        return group.items
            .filter(item => item.type === 'timebased')
            .flatMap(item => item.objects as Project[])
    }

    navigateToProjectSupport(projectId: string): void {
        this.#router.navigate(['/projects', projectId, 'support'])
    }

    getProjectValue(project: Project): number {
        return (project.uninvoiced_hours || 0) * (project.target_wage || 0)
    }

    aggregateBadges(group: TGroupedItem): void {
        // Collect all badge messages using flatMap
        const badges = group.items
            .flatMap(item => item.objects)
            .filter(obj => obj.badge?.[1])
            .map(obj => obj.badge![1])

        if (badges.length === 0) return

        // Remove duplicates and format
        const uniqueBadges = [...new Set(badges)]
        const tooltipMessage = uniqueBadges.length > 1
            ? uniqueBadges.map(b => `• ${b}`).join('\n')
            : uniqueBadges[0]

        group.company.badge = ['bg-danger', tooltipMessage]
    }
}
