import { Dictionary } from '@constants/constants';
import { InjectionToken } from '@angular/core';
import { MODEL_REGISTRY } from './model-registry';

export const MODEL_REGISTRY_TOKEN = new InjectionToken<Dictionary<any>>(
    'MODEL_REGISTRY_TOKEN',
    { factory: () => MODEL_REGISTRY }, // ensures DI still works
);
