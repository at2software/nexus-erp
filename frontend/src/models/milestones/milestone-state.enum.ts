export enum MilestoneState {
    TODO = 0,
    IN_PROGRESS = 1,
    DONE = 2
}

export const MILESTONE_STATES: Record<number, { name: string; color: string; bgClass: string }> = {
    [MilestoneState.TODO]: {
        name: $localize`:@@i18n.milestone.toDo:To Do`,
        color: '#6c757d', // grey
        bgClass: 'bg-secondary'
    },
    [MilestoneState.IN_PROGRESS]: {
        name: $localize`:@@i18n.milestone.inProgress:In Progress`,
        color: 'var(--color-primary-4)', // primary-4
        bgClass: 'bg-primary'
    },
    [MilestoneState.DONE]: {
        name: $localize`:@@i18n.milestone.done:Done`,
        color: 'var(--color-primary-1)', // primary-1
        bgClass: 'bg-success'
    }
};

export function getMilestoneStateInfo(state: MilestoneState | number | null | undefined) {
    let stateValue: MilestoneState;

    if (typeof state === 'number') {
        stateValue = state as MilestoneState;
    } else if (state !== null && state !== undefined) {
        stateValue = state;
    } else {
        stateValue = MilestoneState.TODO;
    }

    return MILESTONE_STATES[stateValue] || MILESTONE_STATES[MilestoneState.TODO];
}