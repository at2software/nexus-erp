import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { tracked } from '@constants/tracked';
import { FileService } from '@models/file/file.service';
import { File } from '@models/file/file.model';
import { IHasFiles } from '@models/file/has-files.interface';
import { DatePipe } from '@angular/common';
import { DndDirective } from '@directives/dnd.directive';
import { FileComponent } from '@shards/file/file.component';
import { Nx } from '@app/nx/nx.directive';

@Component({
    selector: 'media-preview',
    templateUrl: './media-preview.component.html',
    imports: [DatePipe, DndDirective, FileComponent, Nx],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MediaPreviewComponent {
    readonly parent = input.required<IHasFiles>();
    readonly trackedParent = tracked(this.parent);
    protected readonly files = computed<File[]>(() => this.trackedParent()?.files ?? []);

    #fileService = inject(FileService);

    show = (_: File) => this.#fileService.download(_);

    onUploaded() {
        this.trackedParent().refresh().subscribe();
    }
}
