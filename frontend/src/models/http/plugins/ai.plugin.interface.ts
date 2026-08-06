import { Observable } from 'rxjs';
import { IPlugin } from './plugin.instance';
import { AiModelDto, AiCompletionDto } from '@models/_core/api-response';

export abstract class IAIPlugin extends IPlugin {
    IAIPluginProperty!: boolean;
    models: AiModelDto[] = [];

    abstract listModels(): Observable<AiModelDto[]>;
    abstract createCompletion(prompt: string, model?: string): Observable<AiCompletionDto>;
    abstract healthCheck(): Observable<unknown>;
    abstract getDefaultModel(): AiModelDto | undefined;

    createEmbedding?: (text: string, model?: string) => Observable<unknown>;
    createImage?: (prompt: string, model?: string) => Observable<unknown>;
}
