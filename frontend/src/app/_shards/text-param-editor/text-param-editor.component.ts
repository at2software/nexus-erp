import { Component, inject, TemplateRef, viewChild, computed, effect, input, signal, untracked } from '@angular/core';
import { AngularEditorConfig, AngularEditorModule, AngularEditorComponent } from '@kolkov/angular-editor';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Param } from 'src/models/param.model';
import { ParamService } from 'src/models/param.service';
import { DEFAULT_RTE_CONFIG } from './default-rte-config';
import { Dictionary } from 'src/constants/constants';
import { personalized } from 'src/constants/personalized';
import { Serializable } from 'src/models/serializable';
import { MarketingService } from '@models/marketing/marketing.service';
import { File } from '@models/file/file.model';
import { FormsModule } from '@angular/forms';
import { SafePipe } from 'src/pipes/safe.pipe';
import { PaymentPlanEditorComponent } from '@shards/payment-plan-editor/payment-plan-editor.component';

type ContentSegment = { type: 'html'; content: string } | { type: 'payment-plan' }
interface I18nVariant { language: string; formality: string; text: string }

@Component({
    selector: 'text-param-editor',
    templateUrl: './text-param-editor.component.html',
    styleUrls: ['./text-param-editor.component.scss'],
    standalone: true,
    imports: [AngularEditorModule, FormsModule, SafePipe, PaymentPlanEditorComponent]
})
export class TextParamEditorComponent {

    annotations   = input<boolean>(false)
    key           = input<string>('')
    object        = input<Serializable | undefined>(undefined)
    fallback      = input<boolean>(false)
    config        = input<AngularEditorConfig>(DEFAULT_RTE_CONFIG)
    to            = input<Dictionary | null>(null)
    maxHeight     = input<string | undefined>(undefined)
    locale        = input<string | undefined>(undefined)
    previewLocale = input<string | undefined>(undefined)

    readonly editor = viewChild<AngularEditorComponent>('editor');
    readonly imageSelectionModal = viewChild<TemplateRef<any>>('imageSelectionModal');

    param            = signal<Param | undefined>(undefined)
    images           = signal<File[]>([])
    loadingImages    = signal(false)
    isExpanded       = signal(false)
    isLocalized      = signal(false)
    currentLanguage  = signal('de')
    currentFormality = signal('formal')
    i18nVariants     = signal<I18nVariant[]>([])
    editorValue      = signal('')

    executeCommandFn?: (command: string, value?: any) => void

    readonly availableLocales = computed(() =>
        this.i18nVariants().map(v => ({
            language: v.language,
            formality: v.formality,
            label: `${v.language.toUpperCase()} - ${v.formality}`
        }))
    )

    readonly selectedLocaleKey = computed(() =>
        `${this.currentLanguage()}-${this.currentFormality()}`
    )

    readonly showLocalizationControls = computed(() =>
        !this.object() && !this.previewLocale()
    )

    readonly showModalLocalizationControls = computed(() => !this.object())

    readonly contentSegments = computed((): ContentSegment[] => {
        const p = this.param()
        if (!p) return []
        const val = this.#getDisplayValue()
        if (!val.includes('[payment-plan]')) {
            return [{ type: 'html', content: val.formatPlaceholders() }]
        }
        const parts = val.split('[payment-plan]')
        return parts.flatMap((part, i) => {
            const items: ContentSegment[] = []
            if (part) items.push({ type: 'html', content: part.formatPlaceholders() })
            if (i < parts.length - 1) items.push({ type: 'payment-plan' })
            return items
        })
    })

    #modalService     = inject(NgbModal)
    #paramService     = inject(ParamService)
    #marketingService = inject(MarketingService)

    constructor() {
        effect(() => {
            const key = this.key()
            untracked(() => this.#loadParam(key, this.object(), this.fallback()))
        })

        effect(() => {
            this.locale()
            this.previewLocale()
            untracked(() => { if (this.param()) this.#applyLocale() })
        }, { allowSignalWrites: true })
    }

    #loadParam(key: string, object: Serializable | undefined, fallback: boolean) {
        if (!key) return
        if (object?.params && key in object.params && object.params[key]) {
            this.#assignJson({ key, value: object.params[key], parent_path: object.getApiPathWithId(), fallback: false })
            return
        }
        if (object) {
            object.showParam(key, { fallback }).subscribe((data: any) => this.#assignJson(data))
        } else {
            this.#paramService.show(key, { fallback }).subscribe((data: any) => this.#assignJson(data))
        }
    }

    #applyLocale() {
        if (!this.isLocalized() || !this.i18nVariants().length) return

        const localeStr = this.previewLocale() || this.locale() || (this.to() as any)?.getLocale?.() || 'de-formal'
        const [targetLang, targetFormality] = localeStr.split('-')
        const variants = this.i18nVariants()

        const target = variants.find(v => v.language === targetLang && v.formality === targetFormality)
            || variants.find(v => v.language === 'de' && v.formality === 'formal')
            || variants[0]

        if (target) {
            this.currentLanguage.set(target.language)
            this.currentFormality.set(target.formality)
        }
    }

    #assignJson(json: any) {
        this.#assign(Param.fromJson(json))
    }

    #assign(p: Param) {
        this.param.set(p)
        if (Array.isArray(p.value)) {
            this.isLocalized.set(true)
            this.i18nVariants.set(p.value as I18nVariant[])
            this.#applyLocale()
        } else {
            this.isLocalized.set(false)
            this.i18nVariants.set([])
        }
    }

    open(content: TemplateRef<any>) {
        this.editorValue.set(this.isLocalized() ? this.#getCurrentVariantText() : (this.param()?.value as string ?? ''))

        this.#modalService.open(content, { size: 'lg' }).result.then(() => {
            this.#ensureObjectPath()
            const p = this.param()!
            if (this.isLocalized()) {
                const variant = this.i18nVariants().find(
                    v => v.language === this.currentLanguage() && v.formality === this.currentFormality()
                )
                if (variant) variant.text = this.editorValue()
                p.update({ value: [...this.i18nVariants()] }).subscribe(r => this.#assignJson(r))
            } else {
                p.update({ value: this.editorValue() }).subscribe(r => this.#assignJson(r))
            }
        })
    }

    #ensureObjectPath() {
        const object = this.object()
        const p = this.param()
        if (object && p?.fallback) {
            p.parent_path = object.getApiPathWithId()
            p.fallback = false
        }
    }

    resetParam() {
        this.param()?.update({ value: null }).subscribe(r => this.#assignJson(r))
    }

    #getCurrentVariantText(): string {
        if (!this.isLocalized()) return this.param()?.value as string ?? ''
        return this.i18nVariants().find(
            v => v.language === this.currentLanguage() && v.formality === this.currentFormality()
        )?.text ?? ''
    }

    #getDisplayValue(): string {
        const raw = this.isLocalized() ? this.#getCurrentVariantText() : (this.param()?.value as string ?? '')
        return this.to() ? personalized(raw, this.to()!) : raw
    }

    localize() {
        if (this.isLocalized()) return

        const currentText = this.param()?.value as string ?? ''
        const variants: I18nVariant[] = [
            { language: 'de', formality: 'formal',   text: currentText },
            { language: 'de', formality: 'informal', text: currentText },
            { language: 'en', formality: 'formal',   text: currentText },
            { language: 'en', formality: 'informal', text: currentText },
        ]
        this.i18nVariants.set(variants)
        this.isLocalized.set(true)
        this.currentLanguage.set('de')
        this.currentFormality.set('formal')
        this.#ensureObjectPath()
        this.param()!.update({ value: [...variants] }).subscribe(r => this.#assignJson(r))
    }

    removeLocalization() {
        if (!this.isLocalized()) return

        const plainText = this.#getCurrentVariantText()
        this.i18nVariants.set([])
        this.isLocalized.set(false)
        this.#ensureObjectPath()
        this.param()!.update({ value: plainText }).subscribe(r => this.#assignJson(r))
    }

    onLocaleChange(locale: string) {
        if (locale === 'remove') {
            this.removeLocalization()
            return
        }

        if (this.isLocalized() && this.editorValue()) {
            const variants = this.i18nVariants()
            const current = variants.find(
                v => v.language === this.currentLanguage() && v.formality === this.currentFormality()
            )
            if (current) {
                current.text = this.editorValue()
                this.i18nVariants.set([...variants])
            }
        }

        const [lang, formality] = locale.split('-')
        this.currentLanguage.set(lang)
        this.currentFormality.set(formality)
        this.editorValue.set(this.#getCurrentVariantText())
    }

    openImageSelection() {
        this.loadingImages.set(true)
        this.images.set([])
        this.#modalService.open(this.imageSelectionModal()!, { size: 'lg' })

        this.#marketingService.indexMarketingAssets('', '', '').subscribe((data: any) => {
            this.images.set(data.filter((asset: File) => asset.mime?.startsWith('image/')))
            this.loadingImages.set(false)
        })
    }

    selectImage(image: File) {
        if (this.executeCommandFn) this.executeCommandFn('insertHTML', this.#buildImageHtml(image))
        else this.editor()?.executeCommand('insertHTML', this.#buildImageHtml(image))
        this.images.set([])
    }

    selectImageFromModal(image: File, modal: any) {
        if (this.executeCommandFn) this.executeCommandFn('insertHTML', this.#buildImageHtml(image))
        else this.editor()?.executeCommand('insertHTML', this.#buildImageHtml(image))
        modal.close('Image selected')
        this.images.set([])
    }

    #buildImageHtml(image: File): string {
        const url = image.preview_url || image.download_url
        return `<img src="${url}" alt="${image.name}" style="max-width: 100%; height: auto;" />`
    }

    onCustomImageInsert(executeCommandFn: (command: string, value?: any) => void) {
        this.executeCommandFn = executeCommandFn
        this.openImageSelection()
    }

    toggleExpanded() {
        this.isExpanded.update(v => !v)
    }
}
