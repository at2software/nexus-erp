import { AngularEditorConfig } from "@kolkov/angular-editor";

export const DEFAULT_RTE_CONFIG:AngularEditorConfig = {
    editable: true,
    spellcheck: true,
    height: '20rem',
    minHeight: '5rem',
    width: 'auto',
    minWidth: '0',
    translate: 'yes',
    enableToolbar: true,
    showToolbar: true,
    placeholder: 'Text hier eingeben...',
    sanitize: true,
    toolbarPosition: 'top',
    toolbarHiddenButtons: [['insertVideo', 'strikeThrough', 'heading', 'fontName', 'fontSize', 'textColor', 'backgroundColor', 'customClasses', 'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull']],
    customClasses: [
        {
            name: 'Quote',
            class: 'quote',
        },
        {
            name: 'Title Heading',
            class: 'heading',
        }
    ]
}