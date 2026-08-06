import type { ProviderToken } from '@angular/core';
import { nx } from '@models/_core/nx-bridge';
import type { ModalInputResult } from '@models/_core/modal-results';
import type { Serializable } from '@models/_core/serializable';

export const navigateTo = (url: string): void => nx().navigateTo(url);

export const selectWith = <T extends Serializable>(predicate: (_: T) => boolean): void => nx().nxService.selectWith(predicate);

export const getService = <T>(token: ProviderToken<T>): T => nx().getService(token);

export const confirm = (title: string, text: string): Promise<boolean> => nx().confirm(title, text);

export const promptInput = (title: string): Promise<ModalInputResult | undefined> => nx().promptInput(title);
