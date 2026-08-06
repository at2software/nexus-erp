import { ChangeDetectionStrategy, Component, computed, forwardRef, input, signal } from '@angular/core';

import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';

interface I18nVariant {
    language: string;
    formality: string;
    text: string;
}
type I18nValue = string | I18nVariant[];

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'i18n-textarea',
    imports: [FormsModule, NgbDropdownModule],
    templateUrl: './i18n-textarea.component.html',
    styleUrls: ['./i18n-textarea.component.scss'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => I18nTextareaComponent),
            multi: true,
        },
    ],
})
export class I18nTextareaComponent implements ControlValueAccessor {
    placeholder = input<string | undefined>();
    rows = input<number | undefined>();
    label = input<string | undefined>();
    showPlaceholderInfo = input<boolean | undefined>();

    currentLanguage = signal('de');
    currentFormality = signal('formal');
    #internalValue = signal('');
    #i18nVariants = signal<I18nVariant[]>([]);
    #onChange: (value: I18nValue) => void = () => {
        // No-op
    };
    #onTouched: () => void = () => {
        // No-op
    };

    readonly isLocalized = computed(() => this.#i18nVariants().length > 0);

    readonly availableLocales = computed(() =>
        this.#i18nVariants().map((v) => ({
            language: v.language,
            formality: v.formality,
            label: `${v.language.toUpperCase()} - ${v.formality}`,
        })),
    );

    readonly selectedLocaleKey = computed(() => `${this.currentLanguage()}-${this.currentFormality()}`);

    readonly selectedLocaleLabel = computed(
        () => this.availableLocales().find((v) => `${v.language}-${v.formality}` === this.selectedLocaleKey())?.label ?? this.selectedLocaleKey(),
    );

    writeValue(value: I18nValue): void {
        if (Array.isArray(value)) {
            this.#i18nVariants.set(value);
            const defaultVariant = value.find((v) => v.language === 'de' && v.formality === 'formal') || value[0];
            if (defaultVariant) {
                this.currentLanguage.set(defaultVariant.language);
                this.currentFormality.set(defaultVariant.formality);
                this.#internalValue.set(defaultVariant.text);
            }
        } else if (value === '@@i18n') {
            this.#i18nVariants.set([
                { language: 'de', formality: 'formal', text: '' },
                { language: 'de', formality: 'informal', text: '' },
                { language: 'en', formality: 'formal', text: '' },
                { language: 'en', formality: 'informal', text: '' },
            ]);
            this.currentLanguage.set('de');
            this.currentFormality.set('formal');
            this.#internalValue.set('');
        } else {
            this.#i18nVariants.set([]);
            this.#internalValue.set(value || '');
        }
    }

    registerOnChange(fn: (value: I18nValue) => void): void {
        this.#onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.#onTouched = fn;
    }


    get textValue(): string {
        return this.#internalValue();
    }

    set textValue(val: string) {
        this.#internalValue.set(val);
        this.#onTouched();

        if (this.isLocalized()) {
            const lang = this.currentLanguage();
            const formality = this.currentFormality();
            const variants = this.#i18nVariants().map((v) => (v.language === lang && v.formality === formality ? { ...v, text: val } : v));
            this.#i18nVariants.set(variants);
            this.#onChange(variants);
        } else {
            this.#onChange(val);
        }
    }

    localize() {
        if (this.isLocalized()) return;

        const text = this.#internalValue();
        const variants: I18nVariant[] = [
            { language: 'de', formality: 'formal', text },
            { language: 'de', formality: 'informal', text },
            { language: 'en', formality: 'formal', text },
            { language: 'en', formality: 'informal', text },
        ];
        this.#i18nVariants.set(variants);
        this.currentLanguage.set('de');
        this.currentFormality.set('formal');
        this.#onChange(variants);
    }

    removeLocalization() {
        if (!this.isLocalized()) return;

        const plainText = this.#internalValue();
        this.#i18nVariants.set([]);
        this.#internalValue.set(plainText);
        this.#onChange(plainText);
    }

    onLocaleChange(locale: string) {
        if (locale === 'remove') {
            this.removeLocalization();
            return;
        }

        const [lang, formality] = locale.split('-');
        this.currentLanguage.set(lang);
        this.currentFormality.set(formality);

        const variant = this.#i18nVariants().find((v) => v.language === lang && v.formality === formality);
        if (variant) {
            this.#internalValue.set(variant.text);
        }
    }
}
