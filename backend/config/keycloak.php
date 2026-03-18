<?php

return [
    'realm_public_key'                     => env('KEYCLOAK_REALM_PUBLIC_KEY', null),
    'load_user_from_database'              => env('KEYCLOAK_LOAD_USER_FROM_DATABASE', true),
    'user_provider_custom_retrieve_method' => null,
    'user_provider_credential'             => env('KEYCLOAK_USER_PROVIDER_CREDENTIAL', 'email'),
    'token_principal_attribute'            => env('KEYCLOAK_TOKEN_PRINCIPAL_ATTRIBUTE', 'email'),
    'append_decoded_token'                 => env('KEYCLOAK_APPEND_DECODED_TOKEN', false),
    'allowed_resources'                    => env('KEYCLOAK_ALLOWED_RESOURCES', 'account'),
    'leeway'                               => env('KEYCLOAK_LEEWAY', 60),
];
