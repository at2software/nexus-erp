<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Reverb Server
    |--------------------------------------------------------------------------
    |
    | This option controls the default server used by Reverb to handle
    | incoming messages as well as broadcasting message to all your
    | connected clients. At this time only "reverb" is supported.
    |
    */

    'default' => env('PUSHER_SERVER', 'reverb'),

    /*
    |--------------------------------------------------------------------------
    | Reverb Servers
    |--------------------------------------------------------------------------
    |
    | Here you may define details for each of the supported Reverb servers.
    | Each server has its own configuration options that are defined in
    | the array below. You should ensure all the options are present.
    |
    */

    'servers' => [

        'reverb' => [
            'host'     => env('PUSHER_SERVER_HOST', '0.0.0.0'),
            'port'     => env('PUSHER_SERVER_PORT', 8080),
            'path'     => env('PUSHER_SERVER_PATH', ''),
            'hostname' => env('PUSHER_HOST'),
            'options'  => [
                'tls' => [],
            ],
            'max_request_size' => env('PUSHER_MAX_REQUEST_SIZE', 10_000),
            'scaling'          => [
                'enabled' => env('PUSHER_SCALING_ENABLED', false),
                'channel' => env('PUSHER_SCALING_CHANNEL', 'reverb'),
                'server'  => [
                    'url'      => env('REDIS_URL'),
                    'host'     => env('REDIS_HOST', '127.0.0.1'),
                    'port'     => env('REDIS_PORT', '6379'),
                    'username' => env('REDIS_USERNAME'),
                    'password' => env('REDIS_PASSWORD'),
                    'database' => env('REDIS_DB', '0'),
                    'timeout'  => env('REDIS_TIMEOUT', 60),
                ],
            ],
            'pulse_ingest_interval'     => env('PUSHER_PULSE_INGEST_INTERVAL', 15),
            'telescope_ingest_interval' => env('PUSHER_TELESCOPE_INGEST_INTERVAL', 15),
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Reverb Applications
    |--------------------------------------------------------------------------
    |
    | Here you may define how Reverb applications are managed. If you choose
    | to use the "config" provider, you may define an array of apps which
    | your server will support, including their connection credentials.
    |
    */

    'apps' => [

        'provider' => 'config',

        'apps' => [
            [
                'key'     => env('PUSHER_APP_KEY'),
                'secret'  => env('PUSHER_APP_SECRET'),
                'app_id'  => env('PUSHER_APP_ID'),
                'options' => [
                    'host'   => env('PUSHER_HOST'),
                    'port'   => env('PUSHER_PORT', 443),
                    'scheme' => env('PUSHER_SCHEME', 'https'),
                    'useTLS' => env('PUSHER_SCHEME', 'https') === 'https',
                ],
                'allowed_origins'  => ['*'],
                'ping_interval'    => env('PUSHER_APP_PING_INTERVAL', 60),
                'activity_timeout' => env('PUSHER_APP_ACTIVITY_TIMEOUT', 30),
                'max_connections'  => env('PUSHER_APP_MAX_CONNECTIONS'),
                'max_message_size' => env('PUSHER_APP_MAX_MESSAGE_SIZE', 10_000),
            ],
        ],

    ],

];
