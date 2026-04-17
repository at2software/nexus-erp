<?php

namespace App\Http\Controllers;

use App\DAV\OwnCalDAVBackend;
use App\DAV\OwnPDOBasicAuthBackend;
use App\DAV\OwnPrincipalBackend;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Sabre\CalDAV;
use Sabre\CalDAV\ICSExportPlugin;
use Sabre\DAV;
use Sabre\DAVACL;

class CalDAVController extends Controller {
    public function createResponseWithCorrectHeader(Request $request) {
        $response = new Response;
        if (! $request->isMethod('GET')) {
            $response->header('Content-Type', 'application/xml');
        }
        if (! $request->isMethod('OPTIONS')) {
            $response->setStatusCode(207);
        }
        return $response;
    }
    public function handleCalDAV(Request $request) {
        $routeName = $request->route()->getName();
        $this->startCardDAVServer($routeName);
        return $this->createResponseWithCorrectHeader($request);
    }
    public function startCardDAVServer(string $rootUri) {
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

        $icsPlugin = new ICSExportPlugin;
        $server->addPlugin($icsPlugin);

        // And off we go!
        $server->start();
    }
    public function createCardDAVServer($pdo) {
        // Backends
        $principalBackend = new OwnPrincipalBackend($pdo);
        $caldendarBackend = new OwnCalDAVBackend($pdo);

        // Directory tree
        $tree = [
            new DAVACL\PrincipalCollection($principalBackend),
            new CalDAV\CalendarRoot($principalBackend, $caldendarBackend),
        ];

        // The object tree needs in turn to be passed to the server class
        $server = new DAV\Server($tree);

        // CardDAV plugin
        $caldavPlugin = new CalDAV\Plugin;
        $server->addPlugin($caldavPlugin);

        // Sync plugin
        $syncPlugin = new DAV\Sync\Plugin;
        $server->addPlugin($syncPlugin);

        // Browser plugin for testing, Auth and ACL need to be disabled
        // $browserPlugin = new DAV\Browser\Plugin();
        // $server->addPlugin($browserPlugin);
        return $server;
    }
}
