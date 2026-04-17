
import { createInterceptorCondition, INCLUDE_BEARER_TOKEN_INTERCEPTOR_CONFIG, IncludeBearerTokenCondition, KeycloakService, provideKeycloak } from 'keycloak-angular';
import { environment } from 'src/environments/environment';

/**
 * Validate and escape URL for use in regex pattern
 * This is safe because:
 * 1. Input comes from build-time environment config (not user input)
 * 2. All regex special characters are escaped
 * 3. Pattern is validated to be a reasonable URL
 *
 * Note: semgrep flagging is a false positive - the URL is from static config
 * and all special characters are escaped before RegExp construction
 */
function createSafeUrlPattern(url: string): RegExp {
    // Return a never-matching pattern for empty URLs
    if (!url || typeof url !== 'string' || url.length > 500) {
        return /(?!)/; // negative lookahead — never matches any string
    }

    // For relative paths (starting with /), they're also valid patterns
    // For absolute URLs, ensure they start with http:// or https://
    if (!url.startsWith('/') && !/^https?:\/\/.+/.test(url)) {
        return /(?!)/; // neither relative nor absolute URL - never match
    }

    // Escape all regex special characters
    const escapedUrl = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = `^${escapedUrl}.*`;

    // nosemgrep: eslint.detect-non-literal-regexp
    return new RegExp(pattern);
}

export class KeycloakHandler {
    static async loadKeycloakConfig() {
        // If environment variables are not configured, try loading from keycloak.json
        if (!environment.authenticationUrl || !environment.keycloakRealm || !environment.keycloakClientId) {
            try {
                const response = await fetch('/assets/keycloak.json');
                const config = await response.json();
                return {
                    url: config['auth-server-url'] || environment.authenticationUrl,
                    realm: config.realm || environment.keycloakRealm || 'at2',
                    clientId: config.resource || environment.keycloakClientId || 'neuron'
                };
            } catch (error) {
                console.error('Failed to load keycloak.json, using environment defaults:', error);
                return {
                    url: environment.authenticationUrl,
                    realm: environment.keycloakRealm || 'at2',
                    clientId: environment.keycloakClientId || 'neuron'
                };
            }
        }
        return {
            url: environment.authenticationUrl,
            realm: environment.keycloakRealm || 'at2',
            clientId: environment.keycloakClientId || 'neuron'
        };
    }

    static provideKeycloak() {
        // Resolve relative envApi to absolute so the bearer token interceptor can match it.
        // environment.envApi is '/backend/api/' in production (relative path).
        const apiUrl = environment.envApi.startsWith('/')
            ? window.location.origin + environment.envApi
            : environment.envApi;

        // Also create a pattern for the relative API path since HttpClient may use relative URLs
        const apiUrlRelative = environment.envApi;

        // Load Keycloak config synchronously for now - using environment or defaults
        // Note: If authenticationUrl is empty, createSafeUrlPattern will return a never-matching pattern
        const keycloakUrl = environment.authenticationUrl;

        const apiConditionAbsolute = createInterceptorCondition<IncludeBearerTokenCondition>({
            urlPattern: createSafeUrlPattern(apiUrl),
        });

        const apiConditionRelative = createInterceptorCondition<IncludeBearerTokenCondition>({
            urlPattern: createSafeUrlPattern(apiUrlRelative),
        });

        const keycloakCondition = createInterceptorCondition<IncludeBearerTokenCondition>({
            urlPattern: createSafeUrlPattern(keycloakUrl),
        });
        return [
            KeycloakService,
            provideKeycloak({
                config: { 
                    url: keycloakUrl, 
                    realm: environment.keycloakRealm || 'at2', 
                    clientId: environment.keycloakClientId || 'neuron' 
                },
                initOptions: {
                    checkLoginIframe: false,
                    onLoad: 'check-sso',
                    silentCheckSsoRedirectUri: window.location.origin + '/assets/silent-check-sso.html'
                },
            }),
            { provide: INCLUDE_BEARER_TOKEN_INTERCEPTOR_CONFIG, useValue: [apiConditionAbsolute, apiConditionRelative, keycloakCondition] as IncludeBearerTokenCondition[] },
        ]
    }
}