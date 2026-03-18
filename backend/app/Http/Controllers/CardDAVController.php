<?php

namespace App\Http\Controllers;

use App\DAV\OwnAddressBookRoot;
use App\DAV\OwnCardDAVBackend;
use App\DAV\OwnPDOBasicAuthBackend;
use App\DAV\OwnPrincipalBackend;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Sabre\CardDAV;
use Sabre\DAV;
use Sabre\DAVACL;

class CardDAVController extends Controller {
    /**
     * Create a CardDAV response with the correct headers.
     */
    public function createResponseWithCorrectHeader(Request $request): \Illuminate\Http\Response {
        $response = new Response;
        if (! $request->isMethod('GET')) {
            $response->header('Content-Type', 'application/xml');
        }
        // 207 Multi-Status is only for WebDAV responses, not for OPTIONS
        if (! $request->isMethod('OPTIONS')) {
            $response->setStatusCode(207, 'Multi-Status');
        }
        return $response;
    }

    /**
     * Handle CardDAV requests.
     */
    public function handleCardDAV(Request $request): \Illuminate\Http\Response {
        $routeName = $request->route()->getName();
        $this->startCardDAVServer($routeName);
        return $this->createResponseWithCorrectHeader($request);
    }

    /**
     * Start the CardDAV server.
     */
    public function startCardDAVServer(string $rootUri): void {
        $pdo = DB::connection()->getPdo();
        $pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
        $server = $this->createCardDAVServer($pdo);
        $server->setBaseUri($rootUri);
        // Auth plugin
        $authBackend = new OwnPDOBasicAuthBackend($pdo);
        $authPlugin  = new DAV\Auth\Plugin($authBackend);
        $server->addPlugin($authPlugin);
        // ACL plugin
        $aclPlugin = new DAVACL\Plugin;
        $server->addPlugin($aclPlugin);
        // And off we go!
        $server->start();
    }

    /**
     * Create and configure the CardDAV server instance.
     */
    public function createCardDAVServer($pdo): DAV\Server {
        // Backends
        $principalBackend   = new OwnPrincipalBackend($pdo);
        $addressBookBackend = new OwnCardDAVBackend($pdo);
        // Directory tree
        $tree = [
            new DAVACL\PrincipalCollection($principalBackend),
            new OwnAddressBookRoot($principalBackend, $addressBookBackend),
        ];
        // The object tree needs in turn to be passed to the server class
        $server = new DAV\Server($tree);
        // CardDAV plugin
        $carddavPlugin = new CardDAV\Plugin;
        $server->addPlugin($carddavPlugin);
        // Sync plugin
        $syncPlugin = new DAV\Sync\Plugin;
        $server->addPlugin($syncPlugin);
        // Browser plugin (optional, for debugging)
        // $browserPlugin = new DAV\Browser\Plugin();
        // $server->addPlugin($browserPlugin);
        return $server;
    }
}
