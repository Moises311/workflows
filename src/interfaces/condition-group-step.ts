import { IWorkflowStep } from "./workflows";

export interface IConditionGroupConfig {
    runAllValidCriteria: boolean;
}

export interface IConditionGroupStep extends IWorkflowStep {
    defaultStepIds: string[];
    data: IConditionGroupConfig;
}
