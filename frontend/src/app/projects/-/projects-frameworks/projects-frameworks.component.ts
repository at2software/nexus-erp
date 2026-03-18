import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Framework } from '@models/project/framework.model';
import { FrameworkLatest } from '@models/project/framework-latest.model';
import { ProjectService } from '@models/project/project.service';
import { NexusModule } from '@app/nx/nexus.module';
import { Project } from '@models/project/project.model';
import { NgbDropdownModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { Color } from '@constants/Color';

@Component({
    selector: 'projects-frameworks',
    standalone: true,
    imports: [FormsModule, RouterModule, NexusModule, NgbDropdownModule, NgbTooltipModule],
    templateUrl: './projects-frameworks.component.html',
    styleUrl: './projects-frameworks.component.scss'
})
export class ProjectsFrameworksComponent implements OnInit {
    frameworks: Framework[] = []
    latestFrameworks: FrameworkLatest[] = []
    selectedFrameworks = new Set<string>()
    versionsBehindFilter = 0
    #projectService = inject(ProjectService)

    ngOnInit() {
        this.#projectService.indexFrameworks().subscribe(data => {
            data.forEach(d => d.projects = d.projects.map(_ => {
                const p = Project.fromJson(_)
                return p
            }))
            this.frameworks = data
        })
        this.#projectService.indexLatestFrameworks().subscribe(data => {
            this.latestFrameworks = data
        })
    }
    majorOnly = (_:string) => parseInt(_.replace(/.*?(\d+).*/, "$1"))
    latestFor = (_:Framework) => this.latestFrameworks.find(x => x.name == _.framework)
    differenceFromLatestVersion = (f:Framework) => this.majorOnly(this.latestFor(f)?.latest_version ?? '0') - this.majorOnly(f.framework_version)
    getDiffBackgroundColor = (f:Framework) => {
        const d = this.differenceFromLatestVersion(f)
        if (d > 4) return 'text-red'
        if (d > 2) return 'text-orange'
        if (d > 0) return 'text-yellow'
        return 'text-success'
    }
    colorFor = (_:string) => Color.uniqueColorFromString(_)

    toggleFrameworkFilter = (name: string) => {
        if (this.selectedFrameworks.has(name)) {
            this.selectedFrameworks.delete(name)
        } else {
            this.selectedFrameworks.add(name)
        }
    }

    get filteredFrameworks() {
        let filtered = this.frameworks
        if (this.selectedFrameworks.size > 0) {
            filtered = filtered.filter(f => this.selectedFrameworks.has(f.framework))
        }
        if (this.versionsBehindFilter > 0) {
            filtered = filtered.filter(f => this.differenceFromLatestVersion(f) >= this.versionsBehindFilter)
        }
        return filtered.sort((a, b) => Number(a.projects[0]?.company?.id || 0) - Number(b.projects[0]?.company?.id || 0))
    }

    getVersionDistribution = (latestFramework: FrameworkLatest) => {
        const frameworkVersions = this.frameworks.filter(f => f.framework === latestFramework.name)
        const totalProjects = frameworkVersions.reduce((sum, f) => sum + f.projects.length, 0)

        if (totalProjects === 0) return { upToDate: 0, minorBehind: 0, moderateBehind: 0, criticalBehind: 0 }

        const upToDate = frameworkVersions
            .filter(f => this.differenceFromLatestVersion(f) === 0)
            .reduce((sum, f) => sum + f.projects.length, 0)

        const minorBehind = frameworkVersions
            .filter(f => this.differenceFromLatestVersion(f) > 0 && this.differenceFromLatestVersion(f) <= 2)
            .reduce((sum, f) => sum + f.projects.length, 0)

        const moderateBehind = frameworkVersions
            .filter(f => this.differenceFromLatestVersion(f) > 2 && this.differenceFromLatestVersion(f) <= 4)
            .reduce((sum, f) => sum + f.projects.length, 0)

        const criticalBehind = frameworkVersions
            .filter(f => this.differenceFromLatestVersion(f) > 4)
            .reduce((sum, f) => sum + f.projects.length, 0)

        return {
            upToDate: (upToDate / totalProjects) * 100,
            minorBehind: (minorBehind / totalProjects) * 100,
            moderateBehind: (moderateBehind / totalProjects) * 100,
            criticalBehind: (criticalBehind / totalProjects) * 100
        }
    }
}
