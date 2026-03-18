// model-registry.token.ts
import { InjectionToken } from '@angular/core';
import { MODEL_REGISTRY } from './model-registry';

export const MODEL_REGISTRY_TOKEN = new InjectionToken<Record<string, any>>(
  'MODEL_REGISTRY_TOKEN',
  { factory: () => MODEL_REGISTRY }  // ensures DI still works
);
