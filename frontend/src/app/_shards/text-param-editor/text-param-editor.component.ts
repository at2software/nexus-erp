import { ChangeDetectorRef, Component, inject, Input, OnInit, OnChanges, SimpleChanges, Output, TemplateRef, ViewChild } from '@angular/core';
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
import { CommonModule } from '@angular/common';
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
    imports: [CommonModule, AngularEditorModule, FormsModule, SafePipe, PaymentPlanEditorComponent]
})
export class TextParamEditorComponent implements OnInit, OnChanges {

	@Input() annotations : boolean = false
	@Input() key         : string
	@Input() object     ?: Serializable
	@Input() fallback    : boolean           = false
	@Input() config      : AngularEditorConfig = DEFAULT_RTE_CONFIG
	@Input() to          : Dictionary|null         = null
	@Input() maxHeight   ?: string
	@Input() locale      ?: string  // Optional explicit locale for company-scoped params (e.g., 'de-formal')
	@Input() previewLocale?: string // Optional shared preview locale from toolbar (hides individual dropdowns)

	@Output() param: Param
	@ViewChild('editor') editor!: AngularEditorComponent;
	@ViewChild('imageSelectionModal') imageSelectionModal!: TemplateRef<any>;

	paramDefaultValue?: string
	images: File[] = [];
	loadingImages = false;
	executeCommandFn?: (command: string, value?: any) => void;
	isExpanded = false;

	isLocalized = false;
	currentLanguage = 'de';
	currentFormality = 'formal';
	i18nVariants: I18nVariant[] = [];
	editorValue = '';

    #modalService = inject(NgbModal)
    #paramService = inject(ParamService)
    #marketingService = inject(MarketingService)
    #cdr = inject(ChangeDetectorRef)

	ngOnInit(): void {
        this.refresh()
	}

	ngOnChanges(changes: SimpleChanges): void {
		if (changes['key'] && !changes['key'].firstChange) {
			this.refresh()
		}
		if ((changes['locale'] || changes['previewLocale']) && this.param) {
			this.#applyLocale();
		}
	}

	#applyLocale() {
		if (!this.isLocalized || this.i18nVariants.length === 0) return;

		const localeStr = this.previewLocale || this.locale || (this.to as any)?.getLocale?.() || 'de-formal';
		const [targetLang, targetFormality] = localeStr.split('-');

		const targetVariant = this.i18nVariants.find(
			v => v.language === targetLang && v.formality === targetFormality
		) || this.i18nVariants.find(
			v => v.language === 'de' && v.formality === 'formal'
		) || this.i18nVariants[0];

		if (targetVariant) {
			this.currentLanguage = targetVariant.language;
			this.currentFormality = targetVariant.formality;
		}

		if (this.to) {
			this.param.value = personalized(this.getCurrentVariantText(), this.to);
		}
	}
	refresh = () => {
        // Check if param exists in object.params and has a value
        if (this.object?.params && this.key in this.object.params && this.object.params[this.key]) {
            const paramData = {
                key: this.key,
                value: this.object.params[this.key],
                parent_path: this.object.getApiPathWithId(),
                fallback: false
            }
            this.#assignJson(paramData)
            return
        }

        // Otherwise fetch from API with fallback
        if (this.object) {
            this.object.showParam(this.key, {fallback: this.fallback}).subscribe((data:any) => {
                this.#assignJson(data)
            })
        } else {
            this.#paramService.show(this.key, {fallback: this.fallback}).subscribe((data:any) => {
                this.#assignJson(data)
            })
        }
    }
	
    #assignJson = (json:any) => {
        return this.assign(Param.fromJson(json))
    }
    assign = (_:Param) => {
		this.param = _

		if (Array.isArray(this.param.value)) {
			this.isLocalized = true;
			this.i18nVariants = this.param.value as I18nVariant[];
			this.#applyLocale();
		} else {
			this.isLocalized = false;
			this.i18nVariants = [];
			if (this.to) {
				this.param.value = personalized(this.param?.value as string ?? '', this.to);
			}
		}
	}

	open(content:TemplateRef<any>) {
		this.editorValue = this.isLocalized
			? this.getCurrentVariantText()
			: (this.param.value as string ?? '');

		this.#modalService.open(content, { size: 'lg' }).result.then(() => {
			this.#ensureObjectPath();
			if (this.isLocalized) {
				const variant = this.i18nVariants.find(
					v => v.language === this.currentLanguage && v.formality === this.currentFormality
				);
				if (variant) variant.text = this.editorValue;
				this.param.update({ value: [...this.i18nVariants] }).subscribe(this.assign);
			} else {
				this.param.update({ value: this.editorValue }).subscribe(this.assign);
			}
        });
	}

	#ensureObjectPath() {
		if (this.object && this.param.fallback) {
			this.param.parent_path = this.object.getApiPathWithId();
			this.param.fallback = false;
		}
	}

    resetParam = () => this.param.update({ value: null }).subscribe(this.#assignJson)

	getCurrentVariantText(): string {
		if (!this.isLocalized) return this.param.value as string ?? '';
		const variant = this.i18nVariants.find(
			v => v.language === this.currentLanguage && v.formality === this.currentFormality
		);
		return variant?.text ?? '';
	}

	getDisplayValue(): string {
		if (this.to) return this.param.value as string ?? '';
		return this.isLocalized ? this.getCurrentVariantText() : (this.param.value as string ?? '');
	}

	getContentSegments(): ContentSegment[] {
		const val = this.getDisplayValue() ?? ''
		if (!(val as string).includes('[payment-plan]')) {
			return [{ type: 'html', content: (val as string).formatPlaceholders() }]
		}
		const parts = (val as string).split('[payment-plan]')
		return parts.flatMap((part, i) => {
			const items: ContentSegment[] = []
			if (part) items.push({ type: 'html', content: part.formatPlaceholders() })
			if (i < parts.length - 1) items.push({ type: 'payment-plan' })
			return items
		})
	}

	get availableLocales() {
		return this.i18nVariants.map(v => ({
			language: v.language,
			formality: v.formality,
			label: `${v.language.toUpperCase()} - ${v.formality}`
		}));
	}

	get selectedLocaleKey(): string {
		return `${this.currentLanguage}-${this.currentFormality}`;
	}

	get showLocalizationControls(): boolean {
		return !this.object && !this.previewLocale;
	}

	get showModalLocalizationControls(): boolean {
		return !this.object;
	}

	localize() {
		if (this.isLocalized) return;

		const currentText = this.param.value as string ?? '';
		this.i18nVariants = [
			{ language: 'de', formality: 'formal', text: currentText },
			{ language: 'de', formality: 'informal', text: currentText },
			{ language: 'en', formality: 'formal', text: currentText },
			{ language: 'en', formality: 'informal', text: currentText },
		];
		this.isLocalized = true;
		this.currentLanguage = 'de';
		this.currentFormality = 'formal';
		this.#ensureObjectPath();
		this.param.update({ value: [...this.i18nVariants] }).subscribe(this.assign);
	}

	removeLocalization() {
		if (!this.isLocalized) return;

		const plainText = this.getCurrentVariantText();
		this.i18nVariants = [];
		this.isLocalized = false;
		this.#ensureObjectPath();
		this.param.update({ value: plainText }).subscribe(this.assign);
	}

	onLocaleChange(locale: string) {
		if (locale === 'remove') {
			this.removeLocalization();
			return;
		}

		if (this.isLocalized && this.editorValue) {
			const currentVariant = this.i18nVariants.find(
				v => v.language === this.currentLanguage && v.formality === this.currentFormality
			);
			if (currentVariant) currentVariant.text = this.editorValue;
		}

		const [lang, formality] = locale.split('-');
		this.currentLanguage = lang;
		this.currentFormality = formality;
		this.editorValue = this.getCurrentVariantText();
		this.#cdr.detectChanges();
	}

    openImageSelection() {
        this.loadingImages = true;
        this.images = [];

        this.#modalService.open(this.imageSelectionModal, { size: 'lg' });

        this.#marketingService.indexMarketingAssets('', '', '').subscribe((data: any) => {
            this.images = data.filter((asset: File) => asset.mime?.startsWith('image/'));
            this.loadingImages = false;
        });
    }

    selectImage(image: File) {
        const imageUrl = image.preview_url || image.download_url;
        const imageHtml = `<img src="${imageUrl}" alt="${image.name}" style="max-width: 100%; height: auto;" />`;

        if (this.executeCommandFn) this.executeCommandFn('insertHTML', imageHtml);
        else if (this.editor) this.editor.executeCommand('insertHTML', imageHtml);

        this.images = [];
    }

    selectImageFromModal(image: File, modal: any) {
        const imageUrl = image.preview_url || image.download_url;
        const imageHtml = `<img src="${imageUrl}" alt="${image.name}" style="max-width: 100%; height: auto;" />`;

        if (this.executeCommandFn) this.executeCommandFn('insertHTML', imageHtml);
        else if (this.editor) this.editor.executeCommand('insertHTML', imageHtml);

        modal.close('Image selected');
        this.images = [];
    }

    onCustomImageInsert(executeCommandFn: (command: string, value?: any) => void) {
        this.executeCommandFn = executeCommandFn;
        this.openImageSelection();
    }

    toggleExpanded() {
        this.isExpanded = !this.isExpanded;
    }

    getPreviewStyle() {
        if (!this.maxHeight) return {};

        return this.isExpanded
            ? { 'max-height': 'none' }
            : { 'max-height': this.maxHeight, 'overflow': 'hidden' };
    }
}
