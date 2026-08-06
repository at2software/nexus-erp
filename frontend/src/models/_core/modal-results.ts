import type { Product } from '@models/product/product.model';

export interface ModalInputResult {
    text: string;
    more: boolean;
}

export interface ExtIssueLinkResult {
    ext_issue_plugin_link_id: string | null;
    ext_issue_id: string | null;
}

export interface AssignProductResult {
    product?: Product;
    qtyFactor?: number;
    roundTo?: number;
}

export type ReviewDecision = { type: 'approve' } | { type: 'decline'; reason: string } | { type: 'withdraw' };

export interface CombineInvoiceItemsResult {
    description: string;
}

export interface CombineDebriefItemsResult {
    title: string;
}
