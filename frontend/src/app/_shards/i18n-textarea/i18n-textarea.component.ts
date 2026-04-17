import { ChangeDetectorRef, Component, forwardRef, inject, input } from '@angular/core';

import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

type I18nValue = string | { language: string, formality: string, text: string }[];

@Component({
    selector: 'i18n-textarea',
    standalone: true,
    imports: [FormsModule],
    templateUrl: './i18n-textarea.component.html',
    styleUrls: ['./i18n-textarea.component.scss'],
    providers: [{
        provide: NG_VALUE_ACCESSOR,
        useExisting: forwardRef(() => I18nTextareaComponent),
        multi: true
    }]
})
export class I18nTextareaComponent implements ControlValueAccessor {
    #cdr = inject(ChangeDetectorRef);

    placeholder         = input<string|undefined>();
    rows                = input<number|undefined>();
    label               = input<string|undefined>();
    showPlaceholderInfo = input<boolean|undefined>();

    currentLanguage = 'de';
    currentFormality = 'formal';
    #internalValue = '';
    #i18nVariants: { language: string, formality: string, text: string }[] = [];
    #onChange: (value: I18nValue) => void = () => {
        // No-op
    };
    #onTouched: () => void = () => {
        // No-op
    };

    // ControlValueAccessor implementation
    writeValue(value: I18nValue): void {
        if (Array.isArray(value)) {
            this.#i18nVariants = value;
            const defaultVariant = value.find(v => v.language === 'de' && v.formality === 'formal') || value[0];
            if (defaultVariant) {
                this.currentLanguage = defaultVariant.language;
                this.currentFormality = defaultVariant.formality;
                this.#internalValue = defaultVariant.text;
            }
        } else if (value === '@@i18n') {
            // Backend marker without resolved variants (e.g. no i18n records yet) — initialize as empty localized state
            this.#i18nVariants = [
                { language: 'de', formality: 'formal',   text: '' },
                { language: 'de', formality: 'informal', text: '' },
                { language: 'en', formality: 'formal',   text: '' },
                { language: 'en', formality: 'informal', text: '' },
            ];
            this.currentLanguage = 'de';
            this.currentFormality = 'formal';
            this.#internalValue = '';
        } else {
            this.#i18nVariants = [];
            this.#internalValue = value || '';
        }
        this.#cdr.markForCheck();
    }

    registerOnChange(fn: (value: I18nValue) => void): void {
        this.#onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.#onTouched = fn;
    }

    setDisabledState?(): void {
        // Handle disabled state if needed
    }

    // Getters
    get isLocalized(): boolean {
        return this.#i18nVariants.length > 0;
    }

    get availableLocales() {
        return this.#i18nVariants.map(v => ({
            language: v.language,
            formality: v.formality,
            label: `${v.language.toUpperCase()} - ${v.formality}`
        }));
    }

    get selectedLocaleKey(): string {
        return `${this.currentLanguage}-${this.currentFormality}`;
    }

    get textValue(): string {
        return this.#internalValue;
    }

    set textValue(val: string) {
        this.#internalValue = val;
        this.#onTouched();

        if (this.isLocalized) {
            // Update the current variant
            const variant = this.#i18nVariants.find(
                v => v.language === this.currentLanguage && v.formality === this.currentFormality
            );
            if (variant) {
                variant.text = val;
            }
            this.#onChange([...this.#i18nVariants]);
        } else {
            this.#onChange(val);
        }
    }

    // Actions
    localize() {
        if (this.isLocalized) return;

        // Create all 4 variants with current text
        this.#i18nVariants = [
            { language: 'de', formality: 'formal', text: this.#internalValue },
            { language: 'de', formality: 'informal', text: this.#internalValue },
            { language: 'en', formality: 'formal', text: this.#internalValue },
            { language: 'en', formality: 'informal', text: this.#internalValue },
        ];

        this.currentLanguage = 'de';
        this.currentFormality = 'formal';
        this.#onChange([...this.#i18nVariants]);
    }

    removeLocalization() {
        if (!this.isLocalized) return;

        const plainText = this.#internalValue;
        this.#i18nVariants = [];
        this.#internalValue = plainText;
        this.#onChange(plainText);
    }

    onLocaleChange(locale: string) {
        if (locale === 'remove') {
            this.removeLocalization();
            return;
        }

        const [lang, formality] = locale.split('-');
        this.currentLanguage = lang;
        this.currentFormality = formality;

        // Load text for selected locale
        const variant = this.#i18nVariants.find(
            v => v.language === lang && v.formality === formality
        );
        if (variant) {
            this.#internalValue = variant.text;
        }
    }
}
