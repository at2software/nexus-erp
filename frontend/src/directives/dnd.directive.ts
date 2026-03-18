import { Directive, ElementRef, EventEmitter, HostListener, inject, Input, Output, AfterViewInit } from "@angular/core";
import { Toast } from "@shards/toast/toast";
import { forkJoin, Observable } from "rxjs";
import { FileService } from "src/models/file/file.service";

@Directive({
    selector: '[dnd]',
    standalone: true
})
export class DndDirective implements AfterViewInit {

    @Input() dnd:string
    @Input() dndAllowed:string[] = []
    @Input() dndCategory:string = ''
    @Input() collect:boolean = false
    @Output() dndUploaded = new EventEmitter()
    @Output() dndDrop = new EventEmitter()

    #fileService = inject(FileService)
    #elementRef = inject(ElementRef)
    formData = new FormData()
    fileNames:string[] = []
    files:File[] = []

    #cancelDefault = (evt:any) => {
        evt.preventDefault()
        evt.stopPropagation()
    }

    clear() {
        this.formData.delete('html')
        this.formData.delete('file')
        this.formData.delete('file[]')
        this.fileNames = []
    }

    ngAfterViewInit() {
        this.#elementRef.nativeElement.classList.add('dnd-item')
    }

    @HostListener('dragover', ['$event']) onDragOver = (e:any) => {
        this.#cancelDefault(e)
        if (!this.#elementRef.nativeElement.classList.contains('dnd-item-drag')) {
           this.#elementRef.nativeElement.classList.add('dnd-item-drag');
        }
    }
    @HostListener('dragleave', ['$event']) onDragLeave = (e:any) => {
        this.#cancelDefault(e)
        this.#elementRef.nativeElement.classList.remove('dnd-item-drag')
    }
    @HostListener('drop', ['$event']) onDrop(evt:any) {        
        this.#cancelDefault(evt)
        this.#elementRef.nativeElement.classList.remove('dnd-item-drag')
        const files = evt.dataTransfer.files
        if (files.length > 0) {
            const uploads:Observable<any>[] = []
            for (const f of files) {
                const file = f as File
                let allowed = this.dndAllowed.length ? false : true
                if (this.dndAllowed.length) {
                    for (const a of this.dndAllowed) {
                        if (file.type.match(a)) {
                            allowed = true
                        }
                    }
                }
                if (!allowed) {
                    Toast.error(file.name + ' cold not be uploaded: wrong file type (allowed: `' + this.dndAllowed.join('`, `') + ')')
                }
                else {
                    this.formData.append(this.collect ? 'file[]' : 'file', file)
                    if (this.dndCategory) {
                        this.formData.append('category', this.dndCategory)
                    }
                    this.fileNames.push(file.name)
                    this.files.push(file)
                    uploads.push(this.#fileService.upload(this.dnd, this.formData))
                }
            }
            if (uploads.length && !this.collect) {
                forkJoin(uploads).subscribe(() => this.dndUploaded.emit(true))
            }
            if (uploads.length && this.collect) {
                this.dndDrop.emit(this.files)
            }
        }
    }
}