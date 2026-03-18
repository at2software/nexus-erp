import { catchError, map, Observable, of, timeout } from "rxjs";
import { PluginInstance } from "./plugin.instance";
import { IAIPlugin, IAIModel, IAICompletion } from "../ai/ai.plugin.interface";
import { environment } from "src/environments/environment";
import { HttpHeaders } from "@angular/common/http";
import { PluginLink } from "../pluginLink/plugin-link.model";

export class LocalAIPlugin extends PluginInstance implements IAIPlugin {

    IAIPluginProperty: boolean = true;
    models: IAIModel[] = [];
    _name: string = '';
    needsHttpInterceptor: boolean = false; // Disable interceptor since we use CORS proxy
    
    // VCard integration metadata (not used for AI plugins)
    getVcardAttributeName     = () => 'X-NEXUS-LOCALAI'
    isUserInInstance          = (): boolean => false
    getProfileUrl             = (): string => ''
    getUserSelectionModalPath = () => ''
    getInterfacePropertyName  = () => 'IAIPluginProperty'
    getPluginTypeName         = () => 'local_ai'
    
    // CORS Proxy for cross-origin requests
    baseUrl = () => environment.envApi + 'cors' + this._baseUrl.substring(this.enc.value.url.length);
    
    #payload = (url: string, method: string, params: any = {}) => {
        const headers = ['Content-Type: application/json'];
        if (this.enc.value.login && this.enc.value.password) {
            const credentials = btoa(`${this.enc.value.login}:${this.enc.value.password}`);
            headers.push('Authorization: Basic ' + credentials);
        }
        return Object.assign({
            url: this._baseUrl.substring(0, this.enc.value.url.length) + '/' + url,
            method: method.toLowerCase(), // Use lowercase method like Mantis
            headers: headers
        }, { data: params });
    };

    get(url: string, params?: any, ...args: any) { 
        const payload = this.#payload(url, 'GET', params);
        return super.post('', payload, ...args);
    }
    
    post(url: string, params?: any, ...args: any) { 
        const payload = this.#payload(url, 'POST', params);
        return super.post('', payload, ...args);
    }

    icon         = () => 'local_ai';
    getHref      = () => this._baseUrl;
    getName      = () => this._name || 'LocalAI Proxy';
    toPluginLink = () => PluginLink.fromJson({ type: 'local_ai', url: this.enc.value.url });

    // Get activity for comments tab (AI plugins don't have activity)
    getActivityComments(): Observable<any[]> {
        return of([])
    }

    // Health check using LocalAI's health endpoint  
    healthCheck(): Observable<any> {
        return this.get('healthz').pipe(
            timeout(10000), // 10 second timeout
            map((response: any) => {
                // Handle both JSON responses and plain text wrapped in raw_response
                const isHealthy = response?.raw_response === 'OK' || response?.status === 'ok' || typeof response === 'string';
                return { status: isHealthy ? 'healthy' : 'unhealthy', response };
            }),
            catchError((error) => {
                return of({ status: 'unhealthy', error });
            })
        );
    }

    // List available models
    listModels(): Observable<IAIModel[]> {
        return this.get('v1/models').pipe(
            map((response: any) => {
                if (response?.data && Array.isArray(response.data)) {
                    this.models = response.data.map((model: any) => ({
                        id: model.id,
                        name: model.id,
                        owned_by: model.owned_by || 'local'
                    }));
                    return this.models;
                }
                return [];
            }),
            catchError(() => of([]))
        );
    }

    // Helper methods specific to LocalAI
    getDefaultModel(): IAIModel | undefined {
        return this.models.length > 0 ? this.models[0] : undefined;
    }
    
    getModelById(id: string): IAIModel | undefined {
        return this.models.find(model => model.id === id);
    }

    // Create completion using OpenAI-compatible API
    createCompletion(prompt: string, model?: string): Observable<IAICompletion> {
        const selectedModel = model || this.getDefaultModel()?.id || 'default';
        
        const payload = {
            model: selectedModel,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 2048,
            temperature: 0.7
        };

        return this.post('v1/chat/completions', payload).pipe(
            map((response: any) => response as IAICompletion),
            catchError(() => {
                return of({
                    id: '',
                    object: 'chat.completion',
                    created: Date.now(),
                    model: selectedModel,
                    choices: [{
                        index: 0,
                        message: {
                            role: 'assistant',
                            content: 'Error: Failed to generate completion'
                        },
                        finish_reason: 'error'
                    }],
                    usage: {
                        prompt_tokens: 0,
                        completion_tokens: 0,
                        total_tokens: 0
                    }
                } as IAICompletion);
            })
        );
    }

    // Generate text using the AI
    generateText(prompt: string, model?: string): Observable<string> {
        return this.createCompletion(prompt, model).pipe(
            map((completion: IAICompletion) => {
                return completion.choices[0]?.message?.content || 'No response generated';
            })
        );
    }

    // Check if a specific model is available
    hasModel(modelId: string): boolean {
        return this.models.some(model => model.id === modelId);
    }

    // Get model statistics
    getModelStats(): { total: number, available: number } {
        return {
            total: this.models.length,
            available: this.models.length
        };
    }

    // Override interceptor headers for username/password auth
    protected interceptorHeaders = () => {
        const headers: any = { 'Content-Type': 'application/json' };
        if (this.enc.value.login && this.enc.value.password) {
            // Basic Auth with username:password
            const credentials = btoa(`${this.enc.value.login}:${this.enc.value.password}`);
            headers['Authorization'] = `Basic ${credentials}`;
        }
        return new HttpHeaders(headers);
    };

    // Connection logic - test the credentials and endpoint
    protected connect = () => new Promise<void>((resolve, reject) => {
        // Check if we have minimum required configuration
        if (!this.enc.value.url) {
            reject(new Error('No URL configured'));
            return;
        }

        // First check health endpoint, then try to list models
        this.healthCheck().subscribe({
            next: (healthResponse) => {
                if (healthResponse.status === 'healthy') {
                    this.listModels().subscribe({
                        next: () => {
                            this._name = this._baseUrl.replace(/(https?:\/\/)?([^/]*).*/, '$2') + ' (LocalAI Proxy)';
                            resolve();
                        },
                        error: (error) => {
                            reject(error);
                        }
                    });
                } else {
                    reject(healthResponse);
                }
            },
            error: (error) => {
                reject(error);
            }
        });
    });

}