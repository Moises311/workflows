import { IWorkflowStep } from "./workflows";

export interface ICondition {
    attribute: string;
    operator: "eq" | "ne" | "gt" | "lt" | "ge" | "le" | "in" | "nin" | "contains" | "ncontains";
    value: string | number | boolean | Date | null | string[] | number[] | Date[];
}

export interface IConditionConfig {
    operator: "and" | "or";
    conditions: (ICondition | IConditionConfig)[];
}

export interface IConditionStep extends IWorkflowStep {
    data: IConditionConfig;
    sequence?: number;
}
