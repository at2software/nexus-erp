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
    public function createResponseWithCorrectHeader(Request $request): Response {
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

    public function handleCardDAV(Request $request): Response {
        $routeName = $request->route()->getName();
        $this->startCardDAVServer($routeName);
        return $this->createResponseWithCorrectHeader($request);
    }

    public function startCardDAVServer(string $rootUri): void {
        $pdo = DB::connection()->getPdo();
        $pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
        $server = $this->createCardDAVServer($pdo);
        $server->setBaseUri($rootUri);
        $authBackend = new OwnPDOBasicAuthBackend($pdo);
        $authPlugin  = new DAV\Auth\Plugin($authBackend);
        $server->addPlugin($authPlugin);
        $aclPlugin = new DAVACL\Plugin;
        $server->addPlugin($aclPlugin);
        $server->start();
    }

    public function createCardDAVServer($pdo): DAV\Server {
        $principalBackend   = new OwnPrincipalBackend($pdo);
        $addressBookBackend = new OwnCardDAVBackend($pdo);
        $tree = [
            new DAVACL\PrincipalCollection($principalBackend),
            new OwnAddressBookRoot($principalBackend, $addressBookBackend),
        ];
        $server = new DAV\Server($tree);
        $carddavPlugin = new CardDAV\Plugin;
        $server->addPlugin($carddavPlugin);
        $syncPlugin = new DAV\Sync\Plugin;
        $server->addPlugin($syncPlugin);

        // Browser plugin (optional, for debugging)
        // $browserPlugin = new DAV\Browser\Plugin();
        // $server->addPlugin($browserPlugin);
        return $server;
    }
}
