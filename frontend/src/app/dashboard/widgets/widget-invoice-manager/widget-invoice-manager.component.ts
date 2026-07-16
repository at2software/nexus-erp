import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NgbTooltipModule, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { Project } from '@models/project/project.model';
import { Company } from '@models/company/company.model';
import { BaseWidgetComponent, WidgetOptions } from '../base.widget.component';

import { WIDGET_SHARED } from '../widgets.shared';
import { PermissionsDirective } from '@directives/permissions.directive';
import { WidgetService } from '@models/widget.service';
import { forkJoin } from 'rxjs';
import { REFLECTION } from '@constants/constants';
import { Router } from '@angular/router';
import { ParamChartSeries } from '@models/api-response';

type TInvoiceItem = Project | Company;
interface TGroupedItem {
    company: Company;
    items: { type: string; value: number; objects: TInvoiceItem[] }[];
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'widget-invoice-manager',
    templateUrl: './widget-invoice-manager.component.html',
    styleUrls: ['./widget-invoice-manager.component.scss', './../base.widget.component.scss'],
    imports: [NgbTooltipModule, NgbDropdownModule, ...WIDGET_SHARED, PermissionsDirective],
})
export class WidgetInvoiceManagerComponent extends BaseWidgetComponent {
    groupedData = signal<TGroupedItem[]>([]);
    chartData = signal<ParamChartSeries[]>([]);
    #widgetService = inject(WidgetService);
    #router = inject(Router);

    defaultOptions = () => ({
        ...WidgetOptions.onlyMine,
        ...WidgetOptions.chartOnly,
    });

    reload(): void {
        if (!this.hasInvoicesExpenses()) return;

        const options = { ...this.getOptionsURI() };
        const chartOptions = { ...options };
        delete chartOptions['max-items'];
        if (this.hasInvoicesModule()) chartOptions['withChart'] = '1';

        forkJoin({
            timebased: this.#widgetService.indexCashflow('PROJECTS_TIMEBASED', chartOptions, Project),
            support: this.#widgetService.indexCashflow('CUSTOMER_SUPPORT', chartOptions, Company),
            prepared: this.#widgetService.indexCashflow('INVOICES_PREPARED', chartOptions, Company),
        }).subscribe((responses) => {
            const timebased = responses.timebased.objects.map((p) => { p.var.itemType = 'timebased'; return p; });
            const support = responses.support.objects.map((c) => { c.var.itemType = 'support'; return c; });
            const prepared = (responses.prepared.objects || [])
                .map((x) => {
                    const c = REFLECTION(x);
                    if (!(c instanceof Company) && !(c instanceof Project)) return undefined;
                    c.var.itemType = 'prepared';
                    if (c instanceof Company) c.actions[0].action = () => c.navigateTo(`/customers/${c.id}/billing`);
                    if (c instanceof Project) c.actions[0].action = () => c.navigateTo(`/projects/${c.id}/invoicing`);
                    return c;
                })
                .filter((a: TInvoiceItem | undefined): a is TInvoiceItem => !!a)
                .filter((a: TInvoiceItem) => this.#getAppliedValue(a) > 0);

            const allItems = [...timebased, ...support, ...prepared].sort((a, b) => this.#getAppliedValue(b) - this.#getAppliedValue(a));

            const groupMap = new Map<string, TGroupedItem>();
            allItems.forEach((item) => {
                const company = item instanceof Project ? item.company : item;
                if (!groupMap.has(company.id)) groupMap.set(company.id, { company, items: [] });

                const group = groupMap.get(company.id)!;
                const itemType = item.var.itemType;
                const itemValue = this.#getAppliedValue(item);
                const existingItem = group.items.find((i) => i.type === itemType);
                if (existingItem) {
                    existingItem.value += itemValue;
                    existingItem.objects.push(item);
                } else {
                    group.items.push({ type: itemType, value: itemValue, objects: [item] });
                }
            });

            const grouped = Array.from(groupMap.values())
                .map((group) => {
                    group.items.sort((a, b) => b.value - a.value);
                    this.#aggregateBadges(group);
                    return group;
                })
                .sort((a, b) => {
                    const aTotal = a.items.reduce((sum, item) => sum + item.value, 0);
                    const bTotal = b.items.reduce((sum, item) => sum + item.value, 0);
                    return bTotal - aTotal;
                });

            this.groupedData.set(grouped);

            const defaultWage = this.global.setting('HR_HOURLY_WAGE') ?? 0;
            this.value.set(
                timebased.reduce((sum: number, p: Project) => sum + (p.uninvoiced_hours || 0) * (p.target_wage || 0), 0) +
                support.reduce((sum: number, c: Company) => sum + (c.foci_unbilled_sum_duration || 0) * ((c as Company & { individual_wage?: number }).individual_wage ?? defaultWage), 0) +
                prepared.reduce((sum: number, item: TInvoiceItem) => sum + (item.net_remaining || 0), 0)
            );

            const chartSeries = [responses.timebased.history, responses.support.history, responses.prepared.history]
                .filter(Boolean)
                .map((h) => [h].flat()[0]);
            if (chartSeries.length > 0) this.chartData.set(chartSeries as ParamChartSeries[]);
        });
    }

    #getAppliedValue(item: TInvoiceItem): number {
        if (item.var.itemType === 'timebased' && item instanceof Project) return (item.uninvoiced_hours || 0) * (item.target_wage || 0);
        if (item.var.itemType === 'support' && item instanceof Company) return (item.foci_unbilled_sum_duration || 0) * ((item as Company & { individual_wage?: number }).individual_wage ?? this.global.setting('HR_HOURLY_WAGE') ?? 0);
        if (item.var.itemType === 'prepared') return item.net_remaining || 0;
        return 0;
    }

    #aggregateBadges(group: TGroupedItem): void {
        const badges = group.items.flatMap((item) => item.objects).filter((obj) => obj.badge()?.[1]).map((obj) => obj.badge()![1]);
        if (!badges.length) return;
        const uniqueBadges = [...new Set(badges)];
        group.company.setBadge(['bg-danger', uniqueBadges.length > 1 ? uniqueBadges.map((b) => `• ${b}`).join('\n') : uniqueBadges[0]]);
    }

    getColorForType = (type: string) => ({ timebased: 'cyan', support: 'cyan-teal', prepared: 'teal' }[type] ?? 'grey');

    getTooltipForType = (type: string) => ({
        timebased: $localize`:@@i18n.widget.invoiceManager.timebased:time-based projects`,
        support: $localize`:@@i18n.common.customerSupport:customer support`,
        prepared: $localize`:@@i18n.common.preparedInvoices:prepared invoices`,
    }[type] ?? '');

    getTotalForGroup = (group: TGroupedItem) => group.items.reduce((sum, item) => sum + item.value, 0);
    isCompactGroup = (group: TGroupedItem) => !group.company.badge();

    onBadgeClick(group: TGroupedItem, item: { type: string; value: number; objects: TInvoiceItem[] }, event: Event): void {
        event.stopPropagation();
        if (item.type === 'prepared') this.#router.navigate(['/customers', group.company.id, 'billing']);
        else if (item.type === 'support') this.#router.navigate(['/customers', group.company.id, 'support']);
    }

    getTimebasedProjects = (group: TGroupedItem) => group.items.filter((item) => item.type === 'timebased').flatMap((item) => item.objects as Project[]);
    navigateToProjectSupport = (projectId: string) => this.#router.navigate(['/projects', projectId, 'support']);
    getProjectValue = (project: Project) => (project.uninvoiced_hours || 0) * (project.target_wage || 0);
}
