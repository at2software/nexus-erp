export interface RteConfig {
    placeholder?: string;
    height?: string;
    minHeight?: string;
    maxHeight?: string;
}

export const DEFAULT_RTE_CONFIG: RteConfig = {
    placeholder: 'Text hier eingeben...',
    height: '20rem',
    minHeight: '5rem',
};
