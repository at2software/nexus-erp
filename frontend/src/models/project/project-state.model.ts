import { Serializable } from "@models/serializable";
import { ProjectService } from "./project.service";
import { NxGlobal } from "@app/nx/nx.global";
import { Project } from "./project.model";
import { deepMerge } from "@constants/deepMerge";

const mkState = (id:number) => ({ state: ProjectState.stateFor(id) })

export class ProjectAvatar {
    static Prepared    = (args:any = {}) => Project.fromJson(deepMerge({ var: { filter: ProjectState.idsFor(0) }, ...mkState(1) }, args))
    static Running     = (args:any = {}) => Project.fromJson(deepMerge({ var: { filter: ProjectState.idsFor(1) }, ...mkState(2) }, args))
    static Successful  = (args:any = {}) => Project.fromJson(deepMerge({ var: { filter: ProjectState.idsSuccessful() }, ...mkState(3) }, args))
    static Failed      = (args:any = {}) => Project.fromJson(deepMerge({ var: { filter: ProjectState.idsFailed() }, ...mkState(4) }, args))
    static Ignored     = (args:any = {}) => Project.fromJson(deepMerge({ var: { filter: ProjectState.idsIgnored() }, ...mkState(5) }, args))
    static BudgetBased = (args:any = {}) => this.Running(deepMerge({ is_time_based: 0 }, args))
    static TimeBased   = (args:any = {}) => this.Running(deepMerge({ is_time_based: 1 }, args))
    static Internal    = (args:any = {}) => this.Running(deepMerge({ is_internal: 1 }, args))
    static External    = (args:any = {}) => this.Running(deepMerge({ is_internal: 0 }, args))
}

export class ProjectState extends Serializable {

    static ProgressPrepared = 0
    static ProgressRunning = 1
    static ProgressFinished = 2

    static StateChangeWorkflow:Record<string, number[]> = {
        '1': [2,5,6,7],
        '2': [1,3,4,5,8,9],
        '3': [1],
        '4': [1],
        '5': [1],
        '6': [1,2,5,7],
        '7': [1],
        '8': [1,3,4,5,9],
        '9': [1,3,4,5],
    }

    
    name         : string
    progress     : 0|1|2
    color        : string
    is_in_stats  : boolean
    is_successful: boolean
    pivot: any
        
    static API_PATH = (): string => 'project_states'

    SERVICE = () => ProjectService;
    isPrepared           = () => this.progress === ProjectState.ProgressPrepared
    isRunning            = () => this.progress === ProjectState.ProgressRunning
    isFinishedAny        = () => this.progress === ProjectState.ProgressFinished
    isFinishedSuccessful = () => this.isFinishedAny() && this.is_in_stats && this.is_successful
    isFinishedFailed     = () => this.isFinishedAny() && this.is_in_stats && !this.is_successful
    isFinishedIgnored    = () => this.isFinishedAny() && !this.is_in_stats
    
    static stateFor      = (id: number):ProjectState|undefined => NxGlobal.global.project_states.find(_ => _.id == ''+id)
    static idsFor        = (progress:number) => NxGlobal.global.project_states.filter(_ => _.progress == progress).map(_ => _.id).join(',')
    static idsPrepared   = () => NxGlobal.global.project_states.filter(_ => _.isPrepared()).map(_ => _.id).join(',')
    static idsRunning    = () => NxGlobal.global.project_states.filter(_ => _.isRunning()).map(_ => _.id).join(',')
    static idsSuccessful = () => NxGlobal.global.project_states.filter(_ => _.isFinishedSuccessful()).map(_ => _.id).join(',')
    static idsFailed     = () => NxGlobal.global.project_states.filter(_ => _.isFinishedFailed()).map(_ => _.id).join(',')
    static idsIgnored    = () => NxGlobal.global.project_states.filter(_ => _.isFinishedIgnored()).map(_ => _.id).join(',')
    
    getStateIcon(): string {
        switch(this.progress) {
            case 0: return 'lightbulb'; // Prepared
            case 1: return 'play_arrow'; // Running
            case 2: return 'check_circle'; // Finished
            default: return 'circle';
        }
    }
}
