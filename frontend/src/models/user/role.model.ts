import { Dictionary } from '@constants/constants';

export class Role {
    constructor(
        public id: number,
        public name: string,
        public description: string,
    ) {}

    static fromJson(data: Dictionary): Role {
        return new Role(data['id'] as number, data['name'] as string, (data['description'] as string | undefined) ?? '');
    }
}
