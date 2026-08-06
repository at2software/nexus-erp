import { catchError, map, Observable, of, switchMap, throwError, timeout } from 'rxjs';
import { PluginInstance } from './plugin.instance';
import { IAIPlugin } from './ai.plugin.interface';
import { AiModelDto, AiCompletionDto } from '@models/_core/api-response';
import { environment } from '@environments/environment';
import { HttpHeaders } from '@angular/common/http';
import { PluginLink } from '@models/plugin-link/plugin-link.model';
import { Dictionary } from '@constants/constants';
import { Deserializer } from '../http.wrapper';

export class LocalAIPlugin extends PluginInstance implements IAIPlugin {
    IAIPluginProperty: boolean = true;
    models: AiModelDto[] = [];
    _name: string = '';
    needsHttpInterceptor: boolean = false; // Disable interceptor since we use CORS proxy

    getVcardAttributeName = () => 'X-NEXUS-LOCALAI';
    isUserInInstance = (): boolean => false;
    getProfileUrl = (): string => '';
    getUserSelectionModalPath = () => '';
    getInterfacePropertyName = () => 'IAIPluginProperty';
    getPluginTypeName = () => 'local_ai';

    baseUrl = () => environment.envApi + 'cors' + this._baseUrl.substring(this.enc.value.url.length);

    #payload = (url: string, method: string, params: Dictionary = {}) => {
        const headers = ['Content-Type: application/json'];
        if (this.enc?.value?.login && this.enc?.value?.password) {
            const credentials = btoa(`${this.enc.value.login}:${this.enc.value.password}`);
            headers.push('Authorization: Basic ' + credentials);
        }
        return Object.assign(
            {
                url: (this._baseUrl || '').replace(/\/+$/, '') + '/' + url,
                method: method.toLowerCase(),
                headers: headers,
                timeout: 120,
            },
            { data: params },
        );
    };

    get<T = unknown>(url: string, params?: Dictionary, ...args: unknown[]) {
        const payload = this.#payload(url, 'GET', params);
        return super.post<T>('', payload, ...(args as Deserializer<T>[])) as Observable<T>;
    }

    post<T = unknown>(url: string, params?: Dictionary, ...args: unknown[]) {
        const payload = this.#payload(url, 'POST', params);
        return super.post<T>('', payload, ...(args as Deserializer<T>[])) as Observable<T>;
    }

    icon = () => 'local_ai';
    getHref = () => this._baseUrl;
    getName = () => this._name || 'LocalAI Proxy';
    toPluginLink = () => PluginLink.fromJson({ type: 'local_ai', url: this.enc.value.url });

    getActivityComments(): Observable<Dictionary[]> {
        return of([]);
    }

    healthCheck(): Observable<{ status: string; response?: unknown; error?: unknown }> {
        return this.get<string | { raw_response?: string; status?: string }>('healthz').pipe(
            timeout(10000), // 10 second timeout
            map((response: { raw_response?: string; status?: string } | string) => {
                const isHealthy = typeof response === 'string' || response.raw_response === 'OK' || response.status === 'ok';
                return { status: isHealthy ? 'healthy' : 'unhealthy', response };
            }),
            catchError((error) => {
                return of({ status: 'unhealthy', error });
            }),
        );
    }

    listModels(): Observable<AiModelDto[]> {
        return this.get<{ data?: { id: string; owned_by?: string }[] }>('v1/models').pipe(
            map((response: { data?: { id: string; owned_by?: string }[] }) => {
                if (response?.data && Array.isArray(response.data)) {
                    this.models = response.data.map((model) => ({
                        id: model.id,
                        name: model.id,
                        owned_by: model.owned_by || 'local',
                    }));
                    return this.models;
                }
                return [];
            }),
            catchError(() => of([])),
        );
    }

    getDefaultModel(): AiModelDto | undefined {
        return this.models.length > 0 ? this.models[0] : undefined;
    }

    getModelById(id: string): AiModelDto | undefined {
        return this.models.find((model) => model.id === id);
    }

    createCompletion(prompt: string, model?: string): Observable<AiCompletionDto> {
        const selectedModel = model || this.getDefaultModel()?.id || 'default';

        const errorCompletion: AiCompletionDto = {
            id: '',
            object: 'chat.completion',
            created: Date.now(),
            model: selectedModel,
            choices: [{ index: 0, message: { role: 'assistant', content: 'Error: Failed to generate completion' }, finish_reason: 'error' }],
            usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        };
        return this.post('v1/chat/completions', {
            model: selectedModel,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 2048,
            temperature: 0.7,
        } as Dictionary).pipe(
            switchMap((response) => {
                const completionResponse = response as AiCompletionDto | { error?: { message?: string } };
                if ('error' in completionResponse && completionResponse.error) {
                    const msg: string = (completionResponse.error as { message?: string }).message || '';
                    if (!msg.includes('unimplemented')) {
                        return throwError(() => new Error(msg));
                    }
                    return this.post<{ choices?: ({ text?: string; finish_reason?: string } & Dictionary)[] }>('v1/completions', {
                        model: selectedModel,
                        prompt,
                        max_tokens: 2048,
                        temperature: 0.7,
                    }).pipe(
                        map(
                            (textResponse: { choices?: ({ text?: string; finish_reason?: string } & Dictionary)[] }) =>
                                ({
                                    ...textResponse,
                                    choices: (textResponse.choices || []).map((c: { text?: string; finish_reason?: string } & Dictionary) => ({
                                        ...c,
                                        message: { role: 'assistant', content: c.text || '' },
                                        finish_reason: c.finish_reason || 'stop',
                                    })),
                                }) as AiCompletionDto,
                        ),
                        catchError(() => of(errorCompletion)),
                    );
                }
                return of(completionResponse as AiCompletionDto);
            }),
            catchError(() => of(errorCompletion)),
        );
    }

    generateText(prompt: string, model?: string): Observable<string> {
        return this.createCompletion(prompt, model).pipe(
            map((completion: AiCompletionDto) => {
                return completion.choices[0]?.message?.content || 'No response generated';
            }),
        );
    }

    hasModel(modelId: string): boolean {
        return this.models.some((model) => model.id === modelId);
    }

    getModelStats(): { total: number; available: number } {
        return {
            total: this.models.length,
            available: this.models.length,
        };
    }

    protected interceptorHeaders = () => {
        const headers: Dictionary<string> = { 'Content-Type': 'application/json' };
        if (this.enc.value.login && this.enc.value.password) {
            const credentials = btoa(`${this.enc.value.login}:${this.enc.value.password}`);
            headers['Authorization'] = `Basic ${credentials}`;
        }
        return new HttpHeaders(headers);
    };

    protected connect = () =>
        new Promise<void>((resolve, reject) => {
            if (!this.enc.value.url) {
                reject(new Error('No URL configured'));
                return;
            }

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
                            },
                        });
                    } else {
                        reject(healthResponse);
                    }
                },
                error: (error) => {
                    reject(error);
                },
            });
        });
}
