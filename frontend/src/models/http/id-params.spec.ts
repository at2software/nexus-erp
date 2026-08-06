import { APP_BASE_HREF } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Company } from '@models/company/company.model';
import { CompanyService } from '@models/company/company.service';
import { ProjectService } from '@models/project/project.service';
import { User } from '@models/user/user.model';
import { UserService } from '@models/user/user.service';
import { VacationService } from '@models/vacation/vacation.service';
import { NxStatic } from '@app/nx/nx.static';
import type { GlobalService } from '@models/global.service';

/**
 * Every one of these helpers accepts "a model or its id". A JSON `"id": 2243` stays a number
 * on the model despite the declared `string`, so narrowing with `typeof x === 'string'`
 * misclassifies a numeric id as a model - which produced `companies/undefined/...` URLs and
 * `user.apiPathWithId is not a function`. They must narrow by instance instead.
 */
describe('id-or-model parameters accept whatever shape the id arrives in', () => {
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting(), { provide: APP_BASE_HREF, useValue: '/' }],
        });
        http = TestBed.inject(HttpTestingController);
        // Populated so building a model does not trace a missing-table warning.
        NxStatic.global = { tables: [{ name: 'companies', columns: [] }, { name: 'users', columns: [] }] } as unknown as GlobalService;
    });

    // `match()` consumes what it returns, so read it once per test.
    const url = () => http.match(() => true).map((r) => r.request.url).join(' ');
    const numeric = 2243 as unknown as string;

    it('company connections', () => {
        TestBed.inject(CompanyService).showConnections(numeric).subscribe();
        expect(url()).toContain('companies/2243/connections');
    });

    it('company projects', () => {
        TestBed.inject(ProjectService).indexForCompany(numeric).subscribe();
        expect(url()).toContain('companies/2243/projects');
    });

    it('user absences', () => {
        TestBed.inject(VacationService).indexAbsences(numeric).subscribe();
        expect(url()).toContain('users/2243/vacation_absences');
    });

    it('user foci stats', () => {
        TestBed.inject(UserService).showFoci30DStats(numeric).subscribe();
        expect(url()).toContain('users/2243/show-foci-30d');
    });

    it('still accepts string ids and model instances', () => {
        TestBed.inject(CompanyService).showConnections('7').subscribe();
        TestBed.inject(CompanyService).showConnections(Company.fromJson({ id: '9' })).subscribe();
        TestBed.inject(VacationService).indexAbsences(User.fromJson({ id: '4' })).subscribe();

        const issued = url();
        expect(issued).toContain('companies/7/connections');
        expect(issued).toContain('companies/9/connections');
        expect(issued).toContain('users/4/vacation_absences');
    });
});
