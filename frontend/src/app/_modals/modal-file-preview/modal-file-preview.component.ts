import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { ModalBaseComponent } from '../modal-base.component';
import { File } from '@models/file/file.model';
import { FileService } from '@models/file/file.service';
import { SafePipe } from '@pipes/safe.pipe';
import { SpinnerComponent } from '@shards/spinner/spinner.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'modal-file-preview',
    templateUrl: './modal-file-preview.component.html',
    styleUrls: ['./modal-file-preview.component.scss'],
    imports: [SafePipe, SpinnerComponent],
})
export class ModalFilePreviewComponent extends ModalBaseComponent<void> implements OnDestroy {
    static override modalOptions: NgbModalOptions = { size: 'xl' };

    readonly file = signal<File | null>(null);
    readonly blobUrl = signal<string | null>(null);
    readonly isImage = computed(() => !!this.file()?.mime?.startsWith('image/'));
    readonly isPdf = computed(() => this.file()?.mime === 'application/pdf');

    #service = inject(FileService);

    init(file: File): void {
        this.file.set(file);
        this.#service.previewBlob(file).subscribe((blob) => this.blobUrl.set(URL.createObjectURL(blob)));
    }

    onSuccess(): void {}

    download = () => this.#service.download(this.file()!);

    ngOnDestroy(): void {
        const url = this.blobUrl();
        if (url) URL.revokeObjectURL(url);
    }
}
