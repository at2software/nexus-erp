import { Observable } from 'rxjs';
import { IPlugin } from '../http/plugin.instance';
import { AiModel, AiCompletionResponse } from '@models/api-response';

export abstract class IAIPlugin extends IPlugin {
    IAIPluginProperty!: boolean;
    models: AiModel[] = [];

    // Core AI functionality that all AI plugins must implement
    abstract listModels(): Observable<AiModel[]>;
    abstract createCompletion(prompt: string, model?: string): Observable<AiCompletionResponse>;
    abstract healthCheck(): Observable<any>;
    abstract getDefaultModel(): AiModel | undefined;

    // Optional AI features (can be implemented by specific plugins)
    createEmbedding?: (text: string, model?: string) => Observable<any>;
    createImage?: (prompt: string, model?: string) => Observable<any>;
}
