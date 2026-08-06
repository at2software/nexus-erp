import { Milestone } from '@models/milestone/milestone.model';
import { Project } from '@models/project/project.model';
import { DailyWorkloadDto, DailyWorkloadElementDto, WorkloadDataDto } from '@models/_core/api-response';

export function mapWorkloadDto(data: WorkloadDataDto | undefined): WorkloadDataDto | null {
    if (!data) return null;
    const daily_workload: DailyWorkloadDto[] = data.daily_workload.map((day) => ({
        ...day,
        elements: day.elements.map((el): DailyWorkloadElementDto => ({ ...el, project: el.project ? Project.fromJson(el.project) : undefined })),
    }));
    return { ...data, daily_workload, unconfigured_milestones: data.unconfigured_milestones.map((_) => Milestone.fromJson(_)) };
}
