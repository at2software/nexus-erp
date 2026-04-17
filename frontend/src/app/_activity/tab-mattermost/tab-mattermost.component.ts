import { AfterViewInit, Component, ContentChild, DestroyRef, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Project } from 'src/models/project/project.model';
import { GlobalService } from 'src/models/global.service';
import { ActivityTabComponent } from 'src/app/_activity/activity-tab.component';
import { markdown2html } from './mattermost.constants';
import { IChatPlugin } from 'src/models/http/chat.plugin.interface';
import { PluginInstance } from 'src/models/http/plugin.instance';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { SafePipe } from 'src/pipes/safe.pipe';


@Component({
    selector: 'activity-tab-mattermost',
    templateUrl: './tab-mattermost.component.html',
    styleUrls: ['./tab-mattermost.component.scss'],
    standalone: true,
    imports: [ActivityTabComponent, ScrollbarComponent, SafePipe]
})
export class TabMattermostComponent implements OnDestroy, OnInit, AfterViewInit {

    #destroyRef = inject(DestroyRef)

    current?: Project
    channel?: string
    hasToken: boolean = false
    posts: any[][] = []

    services: (PluginInstance & IChatPlugin)[] = []
    #global = inject(GlobalService)

    @ViewChild(ActivityTabComponent) containerRef!: ActivityTabComponent;

    #classObserver?: MutationObserver;

    @ViewChild(ActivityTabComponent) tab: ActivityTabComponent
    @ContentChild('scroll') private scroll: ElementRef;

    ngOnInit() {
        this.#global.onRootObjectSelected.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((obj) => {
            if (obj instanceof Project) {
                obj.getChatInstances().then(instances => {
                    this.services = instances
                    instances.forEach(i => {
                        i.init.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => this.reload(i))
                    })
                })
            }
        })
    }
    ngAfterViewInit() {
        this.#classObserver = new MutationObserver(() => {
            if (this.containerRef.el.nativeElement.classList.contains('show')) {
                this.scrollToBottom()
            }
        })
        this.#classObserver.observe(this.containerRef.el.nativeElement, { attributes: true, attributeFilter: ['class'] })
    }

    ngOnDestroy() {
        if (this.#classObserver) {
            this.#classObserver.disconnect()
        }
        this.#destroy$.next()
        this.#destroy$.complete()
    }

    reload = (instance: IChatPlugin) => {
        instance.index().pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((data: any[]) => {
            this.tab.show()
            data.forEach((_: any) => _.message = markdown2html(_.message))
            instance.posts = data
        })
    }
    scrollToBottom() {
        this.tab.scroll()?.el.nativeElement.scroll({
            top: this.tab.scroll()!.el.nativeElement.scrollHeight,
            left: 0,
            behavior: 'smooth'
        })
    }
    onNew(i: IChatPlugin, event: any) {
        event.stopPropagation()
        event.preventDefault()
        i.send(event.target.value).pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(_ => {
            event.target.value = ''
            //this.reload()
        })
    }

}
