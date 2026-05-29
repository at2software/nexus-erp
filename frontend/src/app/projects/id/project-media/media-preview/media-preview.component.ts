import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FileService } from '@models/file/file.service';
import { File } from '@models/file/file.model';
import { IHasFiles } from '@models/file/has_files.interface';
import { DatePipe } from '@angular/common';
import { DndDirective } from '@directives/dnd.directive';
import { FileComponent } from '@shards/file/file.component';
import { Nx } from '@app/nx/nx.directive';

@Component({
    selector: 'media-preview',
    templateUrl: './media-preview.component.html',
    styleUrls: ['./media-preview.component.scss'],
    standalone: true,
    imports: [DatePipe, DndDirective, FileComponent, Nx],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MediaPreviewComponent {
    parent = input.required<IHasFiles>();

    #fileService = inject(FileService);

    show = (_: File) => this.#fileService.show(_);
}
