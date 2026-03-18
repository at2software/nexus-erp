import { Observable } from "rxjs";
import { IPlugin } from "../http/plugin.instance";

export interface IAIModel {
    id: string;
    name: string;
    owned_by: string;
}

export interface IAICompletion {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: {
        index: number;
        message: {
            role: string;
            content: string;
        };
        finish_reason: string;
    }[];
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

export abstract class IAIPlugin extends IPlugin {
    
    IAIPluginProperty: boolean;
    models: IAIModel[] = [];
    
    // Core AI functionality that all AI plugins must implement
    abstract listModels(): Observable<IAIModel[]>;
    abstract createCompletion(prompt: string, model?: string): Observable<IAICompletion>;
    abstract healthCheck(): Observable<any>;
    abstract getDefaultModel(): IAIModel | undefined;
    
    // Optional AI features (can be implemented by specific plugins)
    createEmbedding?: (text: string, model?: string) => Observable<any>;
    createImage?: (prompt: string, model?: string) => Observable<any>;
}