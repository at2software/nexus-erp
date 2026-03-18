import { inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { map, Observable } from 'rxjs';
import { RoleService } from '@models/user/role.service';

@Injectable({
	providedIn: 'root'
})
export class PermissionsGuard {

	#roleService: RoleService = inject(RoleService)
	#router: Router = inject(Router)

	canActivate(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> | boolean | UrlTree {
		const roles = route.data['roles']
		const fallback = route.data['fallback'] ?? ['/dashboard']

		if (this.#roleService.isReady) {
			return this.#checkSync(roles, fallback)
		} else {
			return this.#checkAsync(roles, fallback)
		}
	}

	#checkSync(roles: string, fallback: string[]): boolean | UrlTree {
		if (!roles || this.#roleService.hasAnyRole(roles)) {
			return true
		}
		return this.#router.createUrlTree(fallback)
	}

	#checkAsync(roles: string, fallback: string[]): Observable<boolean | UrlTree> {
		return this.#roleService.onReady.pipe(
			map(() => {
				if (!roles || this.#roleService.hasAnyRole(roles)) {
					return true
				}
				return this.#router.createUrlTree(fallback)
			})
		)
	}
}
