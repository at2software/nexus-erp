import { Component, inject, input } from '@angular/core';
import { FileService } from '@models/file/file.service';
import { File } from '@models/file/file.model';
import { IHasFiles } from '@models/file/has_files.interface';
import { CommonModule, DatePipe } from '@angular/common';
import { DndDirective } from '@directives/dnd.directive';
import { FileComponent } from '@shards/file/file.component';
import { NexusModule } from '@app/nx/nexus.module';

@Component({
    selector: 'media-preview',
    templateUrl: './media-preview.component.html',
    styleUrls: ['./media-preview.component.scss'],
    standalone: true,
    imports: [DatePipe, DndDirective, FileComponent, NexusModule, CommonModule]
})
export class MediaPreviewComponent {
    
    parent = input.required<IHasFiles>()

    #fileService = inject(FileService)

    show = (_:File) => this.#fileService.show(_)
}
