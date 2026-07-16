import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Framework } from '@models/project/framework.model';
import { FrameworkLatest } from '@models/project/framework-latest.model';
import { ProjectService } from '@models/project/project.service';
import { Nx } from '@app/nx/nx.directive';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import { Project } from '@models/project/project.model';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { Color } from '@constants/Color';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'projects-frameworks',
    imports: [FormsModule, RouterModule, Nx, AvatarComponent, NgbTooltipModule],
    templateUrl: './projects-frameworks.component.html',
})
export class ProjectsFrameworksComponent {
    frameworks = signal<Framework[]>([]);
    latestFrameworks = signal<FrameworkLatest[]>([]);
    selectedFrameworks = signal(new Set<string>());
    expandedFrameworks = new Set<string>();
    versionsBehindFilter = signal(0);
    #projectService = inject(ProjectService);

    constructor() {
        this.#projectService.indexFrameworks().subscribe((data) => {
            data.forEach(
                (d) =>
                    (d.projects = d.projects.map((_) => {
                        const p = Project.fromJson(_);
                        return p;
                    })),
            );
            this.frameworks.set(data);
        });
        this.#projectService.indexLatestFrameworks().subscribe((data) => {
            this.latestFrameworks.set(data);
        });
    }
    majorOnly = (_: string) => parseInt(_?.replace(/.*?(\d+).*/, '$1'));
    latestFor = (_: Framework) => this.latestFrameworks().find((x) => x.name == _.framework);
    differenceFromLatestVersion = (f: Framework) => this.majorOnly(this.latestFor(f)?.latest_version ?? '0') - this.majorOnly(f.framework_version);
    getDiffBackgroundColor = (f: Framework) => {
        const d = this.differenceFromLatestVersion(f);
        if (d > 4) return 'text-red';
        if (d > 2) return 'text-orange';
        if (d > 0) return 'text-yellow';
        return 'text-success';
    };
    colorFor = (_: string) => Color.uniqueColorFromString(_);

    rootProjectsFor = (framework: Framework) => {
        const ids = new Set(framework.projects.map((p) => String(p.id)));
        return framework.projects.filter((p) => !p.project_id || !ids.has(String(p.project_id)));
    };

    frameworkIcon = (name: string): string | null => {
        const known = ['laravel', 'angular', 'android', 'ios', 'macos'];
        return known.includes(name) ? `assets/frameworks/${name}.svg` : null;
    };

    toggleExpanded = (key: string, event: Event) => {
        event.stopPropagation();
        if (this.expandedFrameworks.has(key)) this.expandedFrameworks.delete(key);
        else this.expandedFrameworks.add(key);
    };

    toggleFrameworkFilter = (name: string) =>
        this.selectedFrameworks.update((s) => {
            const n = new Set(s);
            if (n.has(name)) n.delete(name); else n.add(name);
            return n;
        });

    readonly filteredFrameworks = computed(() => {
        let filtered = this.frameworks();
        const selected = this.selectedFrameworks();
        if (selected.size > 0) {
            filtered = filtered.filter((f) => selected.has(f.framework));
        }
        const versionsBehind = this.versionsBehindFilter();
        if (versionsBehind > 0) {
            filtered = filtered.filter((f) => this.differenceFromLatestVersion(f) >= versionsBehind);
        }
        return filtered.sort((a, b) => Number(a.projects[0]?.company?.id || 0) - Number(b.projects[0]?.company?.id || 0));
    });

    getVersionDistribution = (latestFramework: FrameworkLatest) => {
        const frameworkVersions = this.frameworks().filter((f) => f.framework === latestFramework.name);
        const totalProjects = frameworkVersions.reduce((sum, f) => sum + f.projects.length, 0);

        if (totalProjects === 0) return { upToDate: 0, minorBehind: 0, moderateBehind: 0, criticalBehind: 0 };

        const upToDate = frameworkVersions.filter((f) => this.differenceFromLatestVersion(f) === 0).reduce((sum, f) => sum + f.projects.length, 0);

        const minorBehind = frameworkVersions.filter((f) => this.differenceFromLatestVersion(f) > 0 && this.differenceFromLatestVersion(f) <= 2).reduce((sum, f) => sum + f.projects.length, 0);

        const moderateBehind = frameworkVersions.filter((f) => this.differenceFromLatestVersion(f) > 2 && this.differenceFromLatestVersion(f) <= 4).reduce((sum, f) => sum + f.projects.length, 0);

        const criticalBehind = frameworkVersions.filter((f) => this.differenceFromLatestVersion(f) > 4).reduce((sum, f) => sum + f.projects.length, 0);
        return {
            upToDate: (upToDate / totalProjects) * 100,
            minorBehind: (minorBehind / totalProjects) * 100,
            moderateBehind: (moderateBehind / totalProjects) * 100,
            criticalBehind: (criticalBehind / totalProjects) * 100,
        };
    };
}
