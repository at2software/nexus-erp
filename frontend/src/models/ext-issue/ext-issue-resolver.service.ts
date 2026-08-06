import { inject, WritableSignal, Service } from '@angular/core';
import { map, Observable, of, shareReplay, switchMap, take } from 'rxjs';
import { PluginInstance } from '../http/plugins/plugin.instance';
import { PluginInstanceFactory } from '../http/plugins/plugin.instance.factory';
import { PluginLink } from '../plugin-link/plugin-link.model';
import { ITaskPlugin } from '../task/task.plugin.interface';
import { Project } from '../project/project.model';

export interface ExtIssueRef {
    href: string;
    icon: string;
    state: number;
}

export interface IHasExtIssueRow {
    id: string;
    effectiveExtIssue(): { linkId: string; issueId: string } | undefined;
}

interface ITaskTracker {
    link: PluginLink;
    instance: PluginInstance & ITaskPlugin;
}

@Service()
export class ExtIssueResolverService {
    #pluginFactory = inject(PluginInstanceFactory);
    #cache = new Map<string, Observable<ExtIssueRef | undefined>>();

    resolve(trackers: ITaskTracker[], ext: { linkId: string; issueId: string } | undefined): Observable<ExtIssueRef | undefined> {
        if (!ext) return of(undefined);
        const tracker = trackers.find((_) => String(_.link.id) === ext.linkId);
        const instance = tracker?.instance;
        if (!instance || typeof instance.fetchIssue !== 'function') return of(undefined);

        const key = `${ext.linkId}:${ext.issueId}`;
        let obs = this.#cache.get(key);
        if (!obs) {
            obs = instance.init.pipe(
                take(1),
                switchMap(() => instance.fetchIssue(ext.issueId)),
                map((ref) => (ref ? { href: ref.href, icon: instance.icon(), state: ref.state } : undefined)),
                shareReplay({ bufferSize: 1, refCount: false }),
            );
            this.#cache.set(key, obs);
        }
        return obs;
    }

    resolveRows(project: Project | undefined, rows: IHasExtIssueRow[], target: WritableSignal<Record<string, ExtIssueRef>>): void {
        target.set({});
        if (!project) return;
        const trackers = (project.plugin_links ?? [])
            .map((link) => ({ link, instance: this.#pluginFactory.instanceFor(link) as (PluginInstance & ITaskPlugin) | undefined }))
            .filter((_): _ is ITaskTracker => !!_.instance && 'ITaskPluginProperty' in _.instance);
        if (!trackers.length) return;

        rows.forEach((row) => {
            this.resolve(trackers, row.effectiveExtIssue()).subscribe((ref) => {
                if (ref) target.update((m) => ({ ...m, [row.id]: ref }));
            });
        });
    }
}
