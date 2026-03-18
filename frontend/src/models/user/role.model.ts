export class Role {
    constructor(
        public id: number,
        public name: string,
        public description: string,
    ) {}

    static fromJson(data: any): Role {
        return new Role(data.id, data.name, data.description ?? '')
    }
}

export interface UserRoleEntry {
    id: string
    name: string
    email: string
    icon: string
    is_retired: boolean
    role_names: string[]
}
