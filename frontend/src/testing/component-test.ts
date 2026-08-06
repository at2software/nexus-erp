import { APP_BASE_HREF } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EnvironmentProviders, Provider, Type, provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Routes, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { LOCALE_CONFIG, LocaleService } from 'ngx-daterangepicker-material';
import { provideEchartsCore } from 'ngx-echarts';
import { NxService } from '@app/nx/nx.service';
import { MODEL_REGISTRY } from '@constants/model/model-registry';
import { MODEL_REGISTRY_TOKEN } from '@constants/model/model-registry.token';
import { GlobalService } from '@models/global.service';
import type { TableColumnDto, TableSchemaDto } from '@models/_core/api-response';

export interface ComponentTestOptions<T = unknown> {
    inputs?: Record<string, unknown>;
    providers?: Provider[];
    routes?: Routes;
    tables?: Record<string, string[]>;
    setup?: (instance: T) => void;
    global?: Partial<GlobalService>;
}

const schema = (tables: Record<string, string[]>): TableSchemaDto[] =>
    Object.entries(tables).map(([name, fields]) => ({ name, columns: fields.map((Field) => ({ Field }) as TableColumnDto) }));

const appProviders = (routes: Routes): (Provider | EnvironmentProviders)[] => [
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(),
    provideHttpClientTesting(),
    provideEchartsCore({ echarts: () => import('echarts') }),
    LocaleService,
    NgbActiveModal,
    { provide: LOCALE_CONFIG, useValue: { format: 'DD.MM.YYYY' } },
    { provide: APP_BASE_HREF, useValue: '/' },
    { provide: MODEL_REGISTRY_TOKEN, useFactory: () => MODEL_REGISTRY },
];

function installGlobalState(tables: Record<string, string[]>, overrides: Partial<GlobalService>): void {
    TestBed.inject(NxService);
    const global = TestBed.inject(GlobalService);
    global.tables = schema(tables);
    global.relations = [];
    global.team = [];
    global.teamAll = [];
    global.enum = {};
    global.dashboards = [];
    global.settings = {};
    Object.assign(global, overrides);
}

export function renderComponent<T>(component: Type<T>, options: ComponentTestOptions<T> = {}): ComponentFixture<T> {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [...appProviders(options.routes ?? []), ...(options.providers ?? [])] });

    installGlobalState(options.tables ?? {}, options.global ?? {});

    const fixture = TestBed.createComponent(component);
    for (const [name, value] of Object.entries(options.inputs ?? {})) fixture.componentRef.setInput(name, value);
    options.setup?.(fixture.componentInstance);
    fixture.detectChanges();
    assertParamsResolved();
    return fixture;
}

function assertParamsResolved(): void {
    const unresolved = TestBed.inject(HttpTestingController)
        .match(() => true)
        .map((r) => r.request.urlWithParams)
        .filter((url) => /\b(undefined|null|NaN)\b/.test(url));

    if (unresolved.length) throw new Error('Request issued with an unresolved parameter: ' + unresolved.join(', '));
}

export function provideDetailGuard<T>(guard: Type<unknown>, build: () => T): Provider {
    return {
        provide: guard,
        useFactory: () => {
            const object = build();
            const held = signal(object, { equal: () => false });
            return { object: held.asReadonly(), touch: () => held.set(object), reload: () => undefined, show: () => of(object) };
        },
    };
}
