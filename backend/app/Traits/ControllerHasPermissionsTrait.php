<?php

namespace App\Traits;

use App\Http\Controllers\Controller;

trait ControllerHasPermissionsTrait {
    public function __bootControllerHasPermissions(): void {
        if (! is_a($this, Controller::class)) {
            return;
        }

        $middleware = $this->permissionsMiddleware();
        $parts      = explode('\\', get_class($this));   // removes the namespace path
        $name       = substr(array_pop($parts), 0, -10);  // removes "Controller" from the end

        $this->middleware(["$middleware:crud.$name.read"])->except($this->exceptedMiddlewares);
        $methods = [
            'store'   => [],
            'update'  => [],
            'destroy' => [],
        ];
        foreach (get_class_methods($this) as $method) {
            if (preg_match('/^store/is', $method)) {
                $methods['store'][] = $method;
            }
            if (preg_match('/^update/is', $method)) {
                $methods['update'][] = $method;
            }
            if (preg_match('/^destroy/is', $method)) {
                $methods['destroy'][] = $method;
            }
        }
        $this->middleware(["$middleware:crud.$name.create"])->only($methods['store'])->except($this->exceptedMiddlewares);
        $this->middleware(["$middleware:crud.$name.update"])->only($methods['update'])->except($this->exceptedMiddlewares);
        $this->middleware(["$middleware:crud.$name.delete"])->only($methods['destroy'])->except($this->exceptedMiddlewares);
    }
}
