import { Component, inject } from '@angular/core';
import { Project } from 'src/models/project/project.model';
import { BaseWidgetComponent, WidgetOptions } from '../base.widget.component';
import { WidgetsModule } from '../widgets.module';
import { PermissionsDirective } from '@directives/permissions.directive';
import { WidgetService } from '@models/widget.service';
import { forkJoin } from 'rxjs';

@Component({
    selector: 'widget-project-manager',
    templateUrl: './widget-project-manager.component.html',
    styleUrls: ['./widget-project-manager.component.scss', './../base.widget.component.scss'],
    standalone: true,
    imports: [WidgetsModule, PermissionsDirective]
})
export class WidgetProjectManagerComponent extends BaseWidgetComponent {

    data: Project[] = []
    chartData: any[] = []
    #widgetService = inject(WidgetService)

    defaultOptions = () => ({
        ...WidgetOptions.onlyMine,
        ...WidgetOptions.onlyMineAsPm,
        ...WidgetOptions.chartOnly,
    })

    reload(): void {
        const options = { ...this.getOptionsURI() }

        // Create chart options without max-items to get full data for chart
        const chartOptions = { ...options }
        delete chartOptions['max-items']

        if (this.hasInvoicesModule) {
            chartOptions['withChart'] = '1'
        }

        // Load both acquisitions and running projects in parallel
        forkJoin({
            acquisitions: this.#widgetService.indexCashflow('PROJECTS_ACQUISITIONS', chartOptions, Project),
            projects: this.#widgetService.indexCashflow('PROJECTS', chartOptions, Project)
        }).subscribe((responses: any) => {
            const acquisitions = (responses.acquisitions.objects || []).map((p: any) => { p.var.projectType = 'acquisition'; return p })
            const projects = (responses.projects.objects || []).map((p: any) => { p.var.projectType = 'running'; return p })

            // Combine and sort by value
            this.data = [...acquisitions, ...projects].sort((a: any, b: any) => {
                const aValue = a.var.projectType === 'acquisition' ? a.net : a.net_remaining
                const bValue = b.var.projectType === 'acquisition' ? b.net : b.net_remaining
                return bValue - aValue
            })

            // Calculate total value
            this.value = acquisitions.reduce((a: any, b: any) => a + b.net, 0) +
                         projects.reduce((a: any, b: any) => a + b.net_remaining, 0)

            // Combine chart data from both sources for stacked display
            if (responses.projects.history && responses.acquisitions.history) {
                this.chartData = [
                    [responses.projects.history].flat()[0],
                    [responses.acquisitions.history].flat()[0]
                ]
            }
        })
    }

    getProbabilityTooltip = (project: Project): string => {
        const probability = ((project.lead_probability || 0) * 100).toFixed(1)
        return $localize`:@@i18n.common.probability:probability` + ': ' + probability + '%'
    }

    isCompact = (project: Project): boolean => !project.badge

    getDisplayValue = (project: Project): number =>
        project.var.projectType === 'acquisition' ? project.net : project.net_remaining
}
