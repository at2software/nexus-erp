import { Directive, ElementRef, HostListener, inject, input, output } from "@angular/core";
import { Toast } from "@shards/toast/toast";
import { forkJoin, Observable } from "rxjs";
import { FileService } from "src/models/file/file.service";

@Directive({
    selector: '[dnd]',
    standalone: true
})
export class DndDirective {

    readonly dnd         = input.required<string>()
    readonly dndAllowed  = input<string[]>([])
    readonly dndCategory = input<string>('')
    readonly collect     = input<boolean>(false)
    readonly dndUploaded = output()
    readonly dndDrop     = output<File[]>()

    readonly #fileService = inject(FileService)
    readonly #el = inject(ElementRef<HTMLElement>)

    formData = new FormData()
    fileNames: string[] = []
    files: File[] = []

    constructor() {
        this.#el.nativeElement.classList.add('dnd-item')
    }

    clear() {
        this.formData.delete('html')
        this.formData.delete('file')
        this.formData.delete('file[]')
        this.fileNames = []
    }

    @HostListener('dragover', ['$event']) onDragOver(e: DragEvent) {
        e.preventDefault()
        e.stopPropagation()
        this.#el.nativeElement.classList.add('dnd-item-drag')
    }

    @HostListener('dragleave', ['$event']) onDragLeave(e: DragEvent) {
        e.preventDefault()
        e.stopPropagation()
        this.#el.nativeElement.classList.remove('dnd-item-drag')
    }

    @HostListener('drop', ['$event']) onDrop(evt: DragEvent) {
        evt.preventDefault()
        evt.stopPropagation()
        this.#el.nativeElement.classList.remove('dnd-item-drag')

        const files = evt.dataTransfer?.files
        if (!files?.length) return

        const uploads: Observable<unknown>[] = []
        for (const file of Array.from(files)) {
            const allowed = !this.dndAllowed().length || this.dndAllowed().some(a => file.type.match(a))
            if (!allowed) {
                Toast.error(`${file.name} could not be uploaded: wrong file type (allowed: \`${this.dndAllowed().join('`, `')}\`)`)
                continue
            }
            this.formData.append(this.collect() ? 'file[]' : 'file', file)
            if (this.dndCategory()) this.formData.append('category', this.dndCategory())
            this.fileNames.push(file.name)
            this.files.push(file)
            uploads.push(this.#fileService.upload(this.dnd(), this.formData))
        }

        if (!uploads.length) return
        if (this.collect()) this.dndDrop.emit(this.files)
        else forkJoin(uploads).subscribe(() => this.dndUploaded.emit())
    }
}
