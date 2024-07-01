import { ICardUpdates, ITimerStep, TWorkflowSteps } from "../interfaces";
import { inMemoryStorage } from "../storage";
import { executeWorkflow, extractConnectionsFromSteps, processWorkflowSteps } from "./workflow-steps";

export function upsertWorkflowStep(workflowId: string, workflowStep: TWorkflowSteps) {
    inMemoryStorage.upsert("workflowSteps", { ...workflowStep, workflowId });
    return workflowStep;
}


export async function postWorkflowSteps(workflowId: string, workflowSteps: TWorkflowSteps[]) {
    const stepConnections = extractConnectionsFromSteps(workflowId, workflowSteps);

    await Promise.all(workflowSteps.map((step) => upsertWorkflowStep(workflowId, step)))
    await processWorkflowSteps(workflowId, stepConnections);
}

export async function patchWorkflowSteps(workflowId: string, workflowSteps: TWorkflowSteps[]) {
    const stepConnections = extractConnectionsFromSteps(workflowId, workflowSteps);

    await Promise.all(workflowSteps.map((step) => upsertWorkflowStep(workflowId, step)))
    await processWorkflowSteps(workflowId, stepConnections, { cleanStepsAndConnections: true });
}

export async function runWorkflow(workflowSteps: TWorkflowSteps[], cardData: ICardUpdates, timerStepIds?: string[]) {
    return executeWorkflow(workflowSteps, cardData, timerStepIds);
}
