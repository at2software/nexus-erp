import { NxStatic } from '@app/nx/nx.static';
import type { GlobalService } from '@models/global.service';
import { ProjectState } from '@models/project/project-state.model';

const state = (id: string, progress: number) => ProjectState.fromJson({ id, name: `s${id}`, progress });

beforeAll(() => {
    NxStatic.global = {
        tables: [],
        project_states: [state('1', ProjectState.ProgressPrepared), state('2', ProjectState.ProgressPrepared), state('3', ProjectState.ProgressRunning)],
    } as unknown as GlobalService;
});

describe('ProjectState id helpers', () => {
    it('returns comma-joined ids, not arrays', () => {
        expect(ProjectState.idsPrepared()).toBe('1,2');
        expect(ProjectState.idsRunning()).toBe('3');
    });

    // Spreading these strings scatters their characters, which produced query params like
    // `1,,,2,3` and made the backend ignore the filter entirely.
    it('concatenates the prepared and running ids into one usable filter', () => {
        expect(ProjectState.idsPreparedOrRunning()).toBe('1,2,3');
        expect([...ProjectState.idsPrepared(), ...ProjectState.idsRunning()].join(',')).not.toBe('1,2,3');
    });
});
