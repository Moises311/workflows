import { IActionStep, ICondition, IConditionGroupStep, IConditionStep, ITimerStep } from ".";

export enum WorkflowStepType {
    CONDITION_GROUP = 100,
    CONDITION = 200,
    TIMER = 300,
    ACTION = 400,
};

export interface IWorkflowStep {
    workflowId: string;
    workflowStepId: string;
    stepType: WorkflowStepType;
    followingStepIds?: string[];
    isInitialStep?: boolean;
}

export interface IWorkflowStepConnection {
    connectionId: string;
    workflowId: string;
    fromStepId: string;
    toStepId: string;
    isConditionGroupDefaultStep?: boolean;
}

export type TWorkflowSteps = (IConditionGroupStep | IConditionStep | IActionStep | ITimerStep);

export interface ICardUpdates {
    [key: string]: any;
}

export interface IWorkflowProcess {
    updates: ICardUpdates,
    timers: ITimerStep[];
};

export function isNumberOrNumericString(value: any): boolean {
    return !isNaN(Number(value)) && value !== '';
}

type OperatorFunction = (a: any, b: any) => boolean;
export const operatorFunctions: Record<ICondition["operator"], OperatorFunction> = {
    eq: (a, b) => {
        if (isNumberOrNumericString(a) && isNumberOrNumericString(b)) {
            return Number(a) === Number(b)
        }
        return a === b
    },
    ne: (a, b) => {
        if (isNumberOrNumericString(a) && isNumberOrNumericString(b)) {
            return Number(a) !== Number(b)
        }
        return a !== b
    },
    gt: (a, b) => {
        if (isNumberOrNumericString(a) && isNumberOrNumericString(b)) {
            return Number(a) > Number(b)
        }
        return a > b
    },
    lt: (a, b) => {
        if (isNumberOrNumericString(a) && isNumberOrNumericString(b)) {
            return Number(a) < Number(b)
        }
        return a < b
    },
    ge: (a, b) => {
        if (isNumberOrNumericString(a) && isNumberOrNumericString(b)) {
            return Number(a) >= Number(b)
        }
        return a >= b
    },
    le: (a, b) => {
        if (isNumberOrNumericString(a) && isNumberOrNumericString(b)) {
            return Number(a) <= Number(b)
        }
        return a <= b
    },
    in: (a, b) => Array.isArray(b) && b.includes(a),
    nin: (a, b) => !Array.isArray(b) || !b.includes(a),
    contains: (a, b) => a.includes(b),
    ncontains: (a, b) => !a.includes(b)
};

