<?php

namespace App\Http\Controllers;

use App\Models\Contact;
use App\Models\ProjectState;
use App\Traits\HasVaultCredentials;
use GuzzleHttp\Client;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class At2ConnectController extends Controller {
    protected $client;
    private $defaultChannel;
    private $userId;
    private $mattermost;

    use HasVaultCredentials;

    public function vaultPrefix(): string {
        return 'AT2CONNECT';
    }
    public function checkCredentials(): bool {
        return $this->checkResponse(fn () => $this->getToken(true));
    }
    public function __construct() {
        $this->client         = $this->getClient();
        $this->mattermost     = PluginMattermostController::createInstance();
        $this->defaultChannel = [
            'id'           => env('AT2CONNECT_DEFAULT_CHANNEL_ID', ''),
            'display_name' => env('AT2CONNECT_DEFAULT_CHANNEL_NAME', 'Support'),
        ];
        $this->userId = env('AT2CONNECT_USER_ID', '');
    }
    private function getClient() {
        if (! $this->client) {
            $this->client = new Client([
                'base_uri' => config('services.openai.endpoint'),
                'headers'  => [
                    'Content-Type' => 'application/json',
                ],
            ]);
        }
        return $this->client;
    }
    private function getToken() {
        $token = Cache::get('api_token');

        if (! $token) {
            $token = $this->loginAndGetToken();
            Cache::put('api_token', $token, now()->addMinutes(59));
        }
        return $token;
    }
    private function curl($method, $path, $payload = []) {
        return $this->client->{$method}(config('services.openai.endpoint').$path, array_merge([
            'headers' => [
                'Content-Type'  => 'application/json',
                'Authorization' => 'Bearer '.$this->getToken(),
            ],
        ], $payload));
    }
    public function loginAndGetToken() {
        $client   = $this->client;
        $response = $client->post(config('services.openai.endpoint').'users/login', [
            'headers' => [
                'Content-Type' => 'application/json',
            ],
            'json' => [
                'login_id' => $this->mattermost->env('LOGIN_ID'),
                'password' => $this->mattermost->env('PASSWORD'),
            ],
        ]);
        return $response->getHeaders()['Token'][0];
    }
    public function getContact(Request $request): ?Contact {
        $token = $request->bearerToken();
        if (empty($token)) {
            return null;
        }
        $contact = Contact::where('at2_connect_token', $token)->get();
        if ($contact->count() == 0) {
            return null;
        }
        $contact = $contact->first();
        return $contact;
    }
    public function showUser(Request $request) {
        $contact  = $this->getContact($request);
        $response = [
            'name' => $contact->name,
            'icon' => $contact->icon,
        ];
        return response()->json($response);
    }
    public function getRawProjects(Request $request) {
        $contact = $this->getContact($request);

        $companyContacts = $contact->companyContacts()
            ->get();

        $availableChannels   = [];
        $availableChannels[] = $this->defaultChannel;

        foreach ($companyContacts as $companyContact) {
            foreach ($companyContact->company->projects as $project) {
                if ($project->state->progress != ProjectState::Finished) {
                    $mattermostPluginLinks = $project->pluginLinks->filter(function ($pluginLink) {
                        return $pluginLink->type === 'mattermost';
                    });
                    foreach ($mattermostPluginLinks as $pluginLink) {
                        $cleanedUrl          = rtrim($pluginLink['url'], '/');
                        $channel_id          = basename($cleanedUrl);
                        $availableChannels[] = [
                            'id'           => $channel_id,
                            'display_name' => $project['name'],
                        ];
                    }
                }
            }
        }
        $availableChannels = array_values($availableChannels);
        return $availableChannels;
    }
    public function indexProjects(Request $request) {
        $availableChannels = $this->getRawProjects($request);
        return response()->json($availableChannels);
    }
    public function indexMembers(Request $request, string $channel_id) {
        if ($this->isChannelAllowed($request, $channel_id)) {
            return response()->json([], Response::HTTP_UNAUTHORIZED);
        }

        $response = $this->curl('get', 'channels/'.$channel_id.'/members', []);

        $user_ids = [];
        $data     = json_decode($response->getBody(), true);
        foreach ($data as $member) {
            $user_ids[] = $member['user_id'];
        }

        $payload       = ['json' => $user_ids];
        $responseUsers = $this->curl('post', 'users/ids', $payload);

        $users     = [];
        $dataUsers = json_decode($responseUsers->getBody(), true);
        foreach ($dataUsers as $user) {
            $responseProfile = $this->curl('get', 'users/'.$user['id'].'/image', []);
            $imageData       = $responseProfile->getBody();
            $base64Image     = base64_encode($imageData);
            $users[]         = [
                'id'         => $user['id'],
                'username'   => $user['username'],
                'first_name' => $user['first_name'],
                'last_name'  => $user['last_name'],
                'nickname'   => $user['nickname'],
                'image'      => 'data:image/jpeg;base64,'.$base64Image,
            ];
        }
        return response()->json($users);
    }
    public function showPreview(Request $request, string $file_id) {
        try {
            $response = $this->curl('get', 'files/'.$file_id.'/preview', []);
            if ($response->getStatusCode() === Response::HTTP_OK) {
                $content     = $response->getBody();
                $contentType = $response->getHeaders()['Content-Type'][0];
                return new Response($content, Response::HTTP_OK, [
                    'Content-Type'        => $contentType,
                    'Content-Disposition' => 'inline; filename="preview.jpg"',
                ]);
            }
        } catch (\Throwable $t) {
            return new Response('', Response::HTTP_OK);
        }
        return response()->json($response);
    }
    public function showThumbnail(Request $request, string $file_id) {
        try {
            $response = $this->curl('get', 'files/'.$file_id.'/preview', []);
            if ($response->getStatusCode() === Response::HTTP_OK) {
                $content     = $response->getBody();
                $contentType = $response->getHeaders()['Content-Type'][0];
                return new Response($content, Response::HTTP_OK, [
                    'Content-Type'        => $contentType,
                    'Content-Disposition' => 'inline; filename="preview.jpg"',
                ]);
            }
        } catch (\Throwable $t) {
            return new Response('', Response::HTTP_OK);
        }
    }
    public function showFile(Request $request, string $file_id) {
        try {
            $response = $this->curl('get', 'files/'.$file_id, []);
            if ($response->getStatusCode() === Response::HTTP_OK) {
                $content            = $response->getBody();
                $contentType        = $response->getHeaders()['Content-Type'][0];
                $contentDisposition = $response->getHeaders()['Content-Disposition'][0];
                preg_match('/filename\*?=[\'"]?([^\'";]+)/i', $contentDisposition, $matches);
                return new Response($content, Response::HTTP_OK, [
                    'Content-Type'        => $contentType,
                    'Content-Disposition' => 'inline; filename="'.($matches[1] ?? null).'"',
                ]);
            }
        } catch (\Throwable $t) {
            return new Response('', Response::HTTP_OK);
        }
        return response()->json($response);
    }
    public function initSupportThread(Request $request) {
        if (! $request->filled('user_id') || ! $request->filled('channel_id')) {
            return response()->json([], Response::HTTP_BAD_REQUEST);
        }

        $user_id       = $request->input('user_id');
        $channel_id    = $request->input('channel_id');
        $newest_thread = $this->getNewestThread($request, $channel_id);
        $thread_id     = null;
        if ($newest_thread != null) {
            if (Contact::isMattermostTimestampFromToday($newest_thread['create_at'])) {
                $thread_id = $newest_thread['id'];
            }
        }
        if (! $thread_id) {
            $currentDate = now()->format('d.m.Y');
            $props       = $this->getProps(null);
            return response()->json([
                'response_type' => 'in_channel',
                'text'          => ':warning: Daily Support-Thread ['.$currentDate.'] - Sichtbar für Kunden!',
                'props'         => $props,
            ]);
        } else {
            $props = $this->getProps(null);
            return response()->json([
                'response_type' => 'ephemeral',
                'text'          => '.',
                'root_id'       => $thread_id,
                'props'         => $props,
            ]);
        }
    }
    public function indexPosts(Request $request, string $channel_id) {
        $posts = $this->getRawPosts($request, $channel_id);
        return response()->json($posts);
    }
    public function getRawPosts(Request $request, string $channel_id, ?string $before = null) {
        if ($this->isChannelAllowed($request, $channel_id)) {
            return response()->json([], Response::HTTP_UNAUTHORIZED);
        }

        $data            = json_decode('{}', true);
        $isSupportThread = false;
        if ($channel_id == $this->defaultChannel['id']) {
            if ($request->before != null) {
                return [[
                    'id' => 'end',
                ]];
            }
            $isSupportThread = true;
            $newest_thread   = $this->getNewestThread($request, $channel_id);

            if ($newest_thread != null && Contact::isMattermostTimestampFromToday($newest_thread['create_at'])) {
                $thread_id = $newest_thread['id'];
                $after     = $request->after;
                $payload   = ['query' => [
                    'after' => $after ?? null,
                ]];
                $response = $this->curl('get', 'posts/'.$thread_id.'/thread', $payload);

                $data = json_decode($response->getBody(), true);
            } else {
                return response()->json([]);
            }
        } else {
            if ($before == null) {
                $before = $request->before;
            }
            $after   = $request->after;
            $payload = ['query' => [
                'before' => $before ?? null,
                'after'  => $after ?? null,
            ]];
            $response = $this->curl('get', 'channels/'.$channel_id.'/posts', $payload);

            $data = json_decode($response->getBody(), true);
        }

        $posts = $data['posts'] ?? [];
        $order = $data['order'];
        if (! $isSupportThread) {
            $order = array_reverse($order);
        }

        $supportThreadRootIds = $this->filterSupportThreads($posts);

        $reorderedPosts = collect($order)
            ->filter(fn ($postId) => isset($posts[$postId]) &&
                ($isSupportThread || in_array($posts[$postId]['root_id'], $supportThreadRootIds)) &&
                (! $isSupportThread || ! empty($posts[$postId]['root_id']))
            )
            ->map(fn ($postId) => [
                'id'          => $posts[$postId]['id'],
                'user_id'     => $posts[$postId]['user_id'],
                'message'     => $posts[$postId]['message'],
                'reply_count' => $posts[$postId]['reply_count'],
                'props'       => $posts[$postId]['props'] ?? [],
                'files'       => $posts[$postId]['metadata']['files'] ?? null,
                'reactions'   => collect($posts[$postId]['metadata']['reactions'] ?? null)
                    ->map(function ($reaction) {
                        return [
                            'user_id'    => $reaction['user_id'],
                            'post_id'    => $reaction['post_id'],
                            'emoji_name' => $reaction['emoji_name'],
                        ];
                    })
                    ->all(),
            ])
            ->values()
            ->all();

        if (! $isSupportThread && empty($request->after)) {
            if (empty($reorderedPosts)) {
                if (isset($data['prev_post_id']) && $data['prev_post_id'] != '') {
                    $length = count($data['order']);
                    if ($length > 0) {
                        $lastId = $data['order'][$length - 1];
                        return $this->getRawPosts($request, $channel_id, $lastId);
                    }
                } else {
                    return [[
                        'id' => 'end',
                    ]];
                }
            }
        }
        return $reorderedPosts;
    }
    public function getNewestThread(Request $request, string $channel_id) {
        if ($channel_id == $this->defaultChannel['id']) {
            $contact = $this->getContact($request);
            if ($contact->at2_connect_thread_id == null) {
                return [];
            }

            $response = $this->curl('get', 'posts/'.$contact->at2_connect_thread_id, []);
            return json_decode($response->getBody(), true);
        } else {
            $response = $this->curl('get', 'channels/'.$channel_id.'/posts', []);

            $data  = json_decode($response->getBody(), true);
            $posts = $data['posts'] ?? [];

            $supportThreadRootIds = $this->filterSupportThreads($posts);

            foreach ($data['order'] as $postId) {
                if (isset($posts[$postId]) && in_array($posts[$postId]['id'], $supportThreadRootIds)) {
                    return $posts[$postId];
                }
            }
        }
        return null;
    }
    public function createFile(Request $request, $channel_id) {
        if ($request->hasFile('file')) {
            $validated = $request->validate([
                'file' => 'required|file|max:51200',
            ]);

            $file     = $request->file('file');
            $filename = $file->getClientOriginalName();

            try {
                $payload = [
                    'query' => [
                        'channel_id' => $channel_id,
                        'filename'   => $filename,
                    ],
                    'body' => file_get_contents($file->getPathname()),
                ];
                $response     = $this->curl('post', 'files', $payload);
                $responseBody = json_decode($response->getBody(), true);
                return response()->json([
                    'filename' => $filename,
                    'file_id'  => $responseBody['file_infos'][0]['id'],
                ]);
            } catch (\Exception $e) {
                return response()->json([
                    'error' => 'Failed to upload the file: '.$e->getMessage(),
                ], 500);
            }
        }
        return response()->json(['error' => 'No file uploaded'], 400);
    }
    public function createPost(Request $request, string $channel_id) {
        if ($this->isChannelAllowed($request, $channel_id)) {
            return response()->json([], Response::HTTP_UNAUTHORIZED);
        }

        $newest_thread = $this->getNewestThread($request, $channel_id);
        $thread_id     = null;
        if ($newest_thread != null) {
            if (Contact::isMattermostTimestampFromToday($newest_thread['create_at'])) {
                $thread_id = $newest_thread['id'];
            }
        }
        if (! $thread_id) {
            $thread_id = $this->startSupportThread($request, $channel_id)['id'];
            if ($channel_id == $this->defaultChannel['id']) {
                $contact                        = $this->getContact($request);
                $contact->at2_connect_thread_id = $thread_id;
                $contact->save();
            }
        }

        $contact  = $this->getContact($request);
        $props    = $this->getProps($contact);
        $message  = $request->message;
        $file_ids = $request->file_ids;

        $payload = ['json' => [
            'channel_id' => $channel_id,
            'message'    => $message,
            'file_ids'   => $file_ids,
            'root_id'    => $thread_id,
            'props'      => $props,
        ]];
        $response = $this->curl('post', 'posts', $payload);

        $data    = json_decode($response->getBody(), true);
        $message = [
            'id'          => $data['id'],
            'user_id'     => $data['user_id'],
            'message'     => $data['message'],
            'reply_count' => $data['reply_count'],
            'props'       => isset($data['props']) ? $data['props'] : [],
            'files'       => isset($data['metadata']['files']) ? $data['metadata']['files'] : null,
            'reactions'   => collect($data['metadata']['reactions'] ?? [])
                ->map(function ($reaction) {
                    return [
                        'user_id'    => $reaction['user_id'],
                        'post_id'    => $reaction['post_id'],
                        'emoji_name' => $reaction['emoji_name'],
                    ];
                })
                ->all(),
        ];
        return response()->json($message);
    }
    public function createReaction(Request $request, string $post_id) {
        $response   = $this->curl('get', 'posts/'.$post_id, []);
        $data       = json_decode($response->getBody(), true);
        $channel_id = $data['channel_id'];

        if ($this->isChannelAllowed($request, $channel_id)) {
            return response()->json([], Response::HTTP_UNAUTHORIZED);
        }

        $user_id    = $this->userId;
        $emoji_name = $request->emoji_name;

        $payload = ['json' => [
            'user_id'    => $user_id,
            'emoji_name' => $emoji_name,
            'post_id'    => $post_id,
            'created_at' => now()->valueOf(),
        ]];
        $response = $this->curl('post', 'reactions', $payload);

        $data = json_decode($response->getBody(), true);
        return response()->json($data);
    }
    public function deleteReaction(Request $request, string $post_id, string $emoji_name) {
        $response   = $this->curl('get', 'posts/'.$post_id, []);
        $data       = json_decode($response->getBody(), true);
        $channel_id = $data['channel_id'];

        if ($this->isChannelAllowed($request, $channel_id)) {
            return response()->json([], Response::HTTP_UNAUTHORIZED);
        }

        $user_id = $this->userId;

        $response = $this->curl('delete', "users/{$user_id}/posts/{$post_id}/reactions/{$emoji_name}", []);

        $data = json_decode($response->getBody(), true);
        return response()->json($data);
    }
    public function startSupportThread(Request $request, string $channel_id) {
        $contact     = $this->getContact($request);
        $props       = $this->getProps($contact);
        $currentDate = now()->format('d.m.Y');

        $payload = ['json' => [
            'channel_id' => $channel_id,
            'message'    => ':warning: Daily Support-Thread ['.$currentDate.'] - Sichtbar für Kunden!',
            'props'      => $props,
        ]];
        $response = $this->curl('post', 'posts', $payload);
        $post     = json_decode($response->getBody(), true);
        return $post;
    }
    public function getProps(?Contact $contact): array {
        $iconSubUrl = $contact->companies[0]?->icon ?? null;
        $iconUrl    = $iconSubUrl ? env('API_URL').$iconSubUrl : null;
        return [
            'from_webhook'         => 'true',
            'webhook_display_name' => $contact?->name ?? 'NEXUS',
            'override_icon_url'    => $iconUrl,
            'override_username'    => $contact?->name ?? 'NEXUS',
        ];
    }
    private function filterSupportThreads($posts) {
        $rootIds = collect($posts)->map(function ($post) {
            return ! empty($post['root_id']) ? $post['root_id'] : $post['id'];
        })->filter()
            ->unique()
            ->values();
        return $rootIds
            ->filter(fn ($postId) => isset($posts[$postId])
                && str_contains($posts[$postId]['message'], 'Daily Support-Thread')
                && isset($posts[$postId]['props']['from_webhook'])
                && $posts[$postId]['props']['from_webhook'] === 'true'
            )
            ->values()
            ->all();
    }
    private function isChannelAllowed(Request $request, $channel_id) {
        $availableChannels = $this->getRawProjects($request);
        $channelAllowed    = array_filter($availableChannels, fn ($item) => $item['id'] === $channel_id);
        return count($channelAllowed) === 0;
    }
}
