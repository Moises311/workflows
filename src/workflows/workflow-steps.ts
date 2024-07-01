import { randomUUID } from "crypto";
import { IActionStep, ICardUpdates, ICondition, IConditionConfig, IConditionGroupStep, IConditionStep, ITimerStep, IWorkflowProcess, IWorkflowStep, IWorkflowStepConnection, TWorkflowSteps, WorkflowStepType, operatorFunctions } from "../interfaces";
import { inMemoryStorage } from "../storage";

export function isConditionStep(workflowStep: any): workflowStep is IConditionStep {
    return workflowStep.stepType === WorkflowStepType.CONDITION;
}

export function isConditionGroupStep(workflowStep: any): workflowStep is IConditionGroupStep {
    return workflowStep.stepType === WorkflowStepType.CONDITION_GROUP;
}

export function isTimerStep(workflowStep: any): workflowStep is ITimerStep {
    return workflowStep.stepType === WorkflowStepType.TIMER;
}

export function isActionStep(workflowStep: any): workflowStep is IActionStep {
    return workflowStep.stepType === WorkflowStepType.ACTION;
}

function getConnectionsFromRequest(
    workflowId: string,
    workflowSteps: IWorkflowStep[],
    currentStep: IWorkflowStep,
    visitedSteps = new Set<string>(),
    params?: { previousStep?: IWorkflowStep, isConditionGroupDefaultStep?: boolean },
): Partial<IWorkflowStepConnection>[] {
    const { previousStep, isConditionGroupDefaultStep } = params || {};

    const followingStepIds = currentStep.followingStepIds?.filter(followingId => workflowSteps.find(ws => ws.workflowStepId === followingId)) ?? [];
    const followingSteps = workflowSteps.filter(step => followingStepIds.includes(step.workflowStepId));
    const connectionPayload = {
        fromStepId: previousStep?.workflowStepId,
        toStepId: currentStep.workflowStepId,
        workflowId: workflowId,
        ...(typeof isConditionGroupDefaultStep === 'boolean' && { isConditionGroupDefaultStep })
    };

    // Condition step always has to have a condition group as previous step
    if (isConditionStep(currentStep) && previousStep?.stepType !== WorkflowStepType.CONDITION_GROUP) {
        throw new Error("Condition should be inside a Condition Group");
    }

    if (visitedSteps.has(currentStep?.workflowStepId) && visitedSteps.has(previousStep?.workflowStepId ?? "")) {
        return [connectionPayload];
    }
    visitedSteps.add(currentStep.workflowStepId);

    if (isConditionGroupStep(currentStep)) {
        const defaultStepsIds = currentStep?.defaultStepIds?.filter(defaultId =>
            workflowSteps.find(ws => ws.workflowStepId === defaultId));
        const defaultSteps = workflowSteps.filter(step => defaultStepsIds?.includes(step.workflowStepId));

        const conditionGroupSteps = followingSteps.flatMap((followingStep) =>
            getConnectionsFromRequest(workflowId, workflowSteps, followingStep, visitedSteps, { previousStep: currentStep }));

        if (!followingSteps.every((step) => step.stepType === WorkflowStepType.CONDITION)) {
            throw new Error("ConditionGroup contains steps that are not Conditions");
        }

        if (defaultSteps && defaultSteps?.length > 0) {
            const defaultStepsPayloads = defaultSteps.flatMap((defaultStep) =>
                getConnectionsFromRequest(workflowId, workflowSteps, defaultStep, visitedSteps, { previousStep: currentStep, isConditionGroupDefaultStep: true }));
            conditionGroupSteps.push(...defaultStepsPayloads);
        }

        return [connectionPayload, ...conditionGroupSteps]
    }

    const connections = followingSteps.flatMap((step) =>
        getConnectionsFromRequest(workflowId, workflowSteps, step, visitedSteps, { previousStep: currentStep }));
    return [connectionPayload, ...connections];
}

function stepsHaveCircularDependencies(fromStepId: string, toStepId: string, existingConnections: IWorkflowStepConnection[]): boolean {
    const visited = new Set();
    const stack = [toStepId];

    while (stack.length > 0) {
        const currentStepId = stack.pop();
        visited.add(currentStepId);

        const children = existingConnections
            .filter(connection => connection.fromStepId === currentStepId)
            .map(connection => connection.toStepId);

        for (const childrenStepId of children) {
            if (childrenStepId === fromStepId) {
                // Found a cycle
                return true;
            }
            if (!visited.has(childrenStepId)) {
                stack.push(childrenStepId);
            }
        }
    }

    return false;
}

export function extractConnectionsFromSteps(
    workflowId: string,
    workflowSteps: TWorkflowSteps[] = [],
): Partial<IWorkflowStepConnection>[] {
    const initialSteps = workflowSteps.filter(ws => !!ws?.isInitialStep);
    if (workflowSteps.length > 0 && (!initialSteps || !initialSteps?.length)) {
        throw new Error("No initial steps configured");
    }

    const workflowStepSet = new Set(workflowSteps.map(step => step.workflowStepId));
    const hasDuplicates = workflowStepSet.size !== workflowSteps.length;
    if (hasDuplicates) {
        throw new Error("Duplicated elements in workflowSteps");
    }

    const visitedSteps = new Set<string>();
    const stepConnections = initialSteps.flatMap((initialStep) => getConnectionsFromRequest(workflowId, workflowSteps, initialStep, visitedSteps));

    // Filter stepConnections by fromStepId and toStepId
    const filteredConnections = stepConnections.filter((connection, index, connectionsArr) => {
        return !connectionsArr.some((prevConnection, prevIndex) =>
            prevIndex < index &&
            prevConnection.fromStepId === connection.fromStepId &&
            prevConnection.toStepId === connection.toStepId
        );
    });

    for (const connection of filteredConnections) {
        const { fromStepId = "", toStepId = "" } = connection;
        const hasCircularDependency = stepsHaveCircularDependencies(fromStepId, toStepId, stepConnections as IWorkflowStepConnection[]);
        if (hasCircularDependency) {
            throw new Error("Circular dependency detected");
        }
    }

    return filteredConnections;
}


export async function processWorkflowSteps(
    workflowId: string,
    stepConnections: Partial<IWorkflowStepConnection>[],
    options?: { cleanStepsAndConnections?: boolean }
) {
    const { cleanStepsAndConnections = false } = options || {};

    const visitedConnectionsIds: IWorkflowStepConnection[] = [];
    const existingConnections = cleanStepsAndConnections ? await getWorkflowStepRelationship(workflowId) : [];
    for (const payload of stepConnections) {
        const stepConnection = await createWorkflowStepConnections(payload, existingConnections);

        if (stepConnection && stepConnection.connectionId) {
            visitedConnectionsIds.push(stepConnection);
        }
        if (!existingConnections.find(existingConnection => existingConnection?.connectionId === stepConnection?.connectionId)) {
            existingConnections.push(stepConnection);
        }
    }

    if (cleanStepsAndConnections && visitedConnectionsIds.length) {
        await cleanUpWorkflowStepConnections(workflowId, visitedConnectionsIds);
        await cleanUpWorkflowSteps(workflowId);
    }
}

export function getWorkflowStepRelationship(workflowId: string): IWorkflowStepConnection[] {
    return inMemoryStorage.find("workflowStepConnections", { workflowId });
}

export function createWorkflowStepConnections(
    payload: Partial<IWorkflowStepConnection>,
    existingConnections: IWorkflowStepConnection[]
): IWorkflowStepConnection {
    const { fromStepId, toStepId } = payload;

    if (!fromStepId) {
        const connectionAlreadyExists = existingConnections.find((connection) => (!connection.fromStepId && connection.toStepId === toStepId));
        if (!!connectionAlreadyExists) {
            return connectionAlreadyExists;
        }
    } else {
        const connectionAlreadyExists = existingConnections.find((connection) => (connection.fromStepId === fromStepId && connection.toStepId === toStepId));
        if (!!connectionAlreadyExists) {
            return connectionAlreadyExists;
        }
    }

    const connectionUUID = randomUUID();
    const stepConnection = { connectionId: connectionUUID, ...payload } as IWorkflowStepConnection;
    inMemoryStorage.create("workflowStepConnections", stepConnection);
    return stepConnection;
}

export function cleanUpWorkflowStepConnections(workflowId: string, stepConnections: IWorkflowStepConnection[]) {
    inMemoryStorage.clear("workflowStepConnections");
    for (const stepConnection of stepConnections) {
        inMemoryStorage.create<IWorkflowStepConnection>("workflowStepConnections", stepConnection);
    }
}

export function cleanUpWorkflowSteps(workflowId: string) {
    const steps = inMemoryStorage.find<IWorkflowStep>("workflowSteps", { workflowId });
    const stepConnections = inMemoryStorage.find<IWorkflowStepConnection>("workflowStepConnections", { workflowId });
    const stepsToDelete = steps.reduce((steps: IWorkflowStep[], step: IWorkflowStep) => {
        const { workflowStepId } = step;
        if (
            !stepConnections.find(sc => sc.fromStepId === workflowStepId) &&
            !stepConnections.find(sc => sc.toStepId === workflowStepId)
        ) {
            return [...steps, step]
        }

        return steps;
    }, []);

    for (const stepToDelete of stepsToDelete) {
        inMemoryStorage.delete<IWorkflowStep>("workflowSteps", { workflowId, workflowStepId: stepToDelete.workflowStepId });
    }
}

export async function executeWorkflow(workflowSteps: TWorkflowSteps[], initialCardData: ICardUpdates, timerStepIds?: string[]) {
    let updates: any = { ...initialCardData };
    let startingPoints: TWorkflowSteps[] = [];

    if (timerStepIds && timerStepIds.length > 0) {
        const timerSteps = workflowSteps.filter(ws => timerStepIds.includes(ws.workflowStepId));
        const followingTimerSteps = timerSteps.reduce((prevValue: TWorkflowSteps[], timerStep: TWorkflowSteps): TWorkflowSteps[] => {
            const startingPoints = workflowSteps.filter(ws => timerStep?.followingStepIds?.includes(ws.workflowStepId));
            return [...prevValue, ...startingPoints];
        }, []);
        startingPoints = followingTimerSteps;
    } else {
        startingPoints = workflowSteps.filter(ws => !!ws.isInitialStep);
    }

    const executeSteps = (workflowSteps: TWorkflowSteps[], currentStep: TWorkflowSteps, cardUpdates: any): IWorkflowProcess => {
        const timers: ITimerStep[] = [];
        let updates: any = JSON.parse(JSON.stringify(cardUpdates));
        const followingSteps = workflowSteps
            .filter(ws => currentStep.followingStepIds?.includes(ws.workflowStepId));

        if (isTimerStep(currentStep)) {
            return { updates, timers: [currentStep] };
        }

        if (isActionStep(currentStep)) {
            const actionStepData = currentStep.data;
            let value = actionStepData.newValue;
            if (actionStepData.actionType === "increment") {
                value = parseInt(initialCardData[actionStepData.changeType]) + parseInt(value);
            }
            updates = { ...updates, [actionStepData.changeType]: value };

            const resultExecuteSteps = followingSteps.flatMap((fs) => executeSteps(workflowSteps, fs, updates));
            for (const resultExecution of resultExecuteSteps) {
                timers.push(...resultExecution.timers);
                updates = { ...updates, ...resultExecution.updates };
            }
        }

        if (isConditionGroupStep(currentStep)) {
            const runAllValidCriteria = !!currentStep?.data?.runAllValidCriteria;

            const conditionStepsOrderedBySequence = followingSteps
                .filter(ws => isConditionStep(ws))
                .sort((a, b) => {
                    const ws = a as IConditionStep;
                    const ws2 = b as IConditionStep;
                    if (!ws?.sequence || !ws2?.sequence) {
                        return 0;
                    }
                    return ws?.sequence - ws2?.sequence;
                }) as IConditionStep[];


            const updatedCard = { ...initialCardData, ...(updates ?? {}) };
            let trueConditionFound = false;
            for (const conditionStep of conditionStepsOrderedBySequence) {
                if (evaluateConditionGroup(conditionStep.data, updatedCard)) {
                    trueConditionFound = true;
                    const followingSteps = workflowSteps
                        .filter(ws => conditionStep.followingStepIds?.includes(ws.workflowStepId));

                    const resultExecuteSteps = followingSteps.flatMap((fs) => executeSteps(workflowSteps, fs, updates));
                    for (const resultExecution of resultExecuteSteps) {
                        timers.push(...resultExecution.timers);
                        updates = { ...updates, ...resultExecution.updates };
                    }

                    if (!runAllValidCriteria) {
                        // Don't run next conditions
                        break;
                    }
                }
            }

            if (!trueConditionFound && currentStep?.defaultStepIds?.length > 0) {
                // Execute default steps if any
                const defaultSteps = workflowSteps
                    .filter(ws => currentStep?.defaultStepIds?.includes(ws.workflowStepId));

                const resultExecuteSteps = defaultSteps.flatMap((fs) => executeSteps(workflowSteps, fs, updates));
                for (const resultExecution of resultExecuteSteps) {
                    timers.push(...resultExecution.timers);
                    updates = { ...updates, ...resultExecution.updates };
                }
            }
        }

        return { updates, timers };
    }

    const resultExecutingSteps = startingPoints.flatMap(startingPoint => executeSteps(workflowSteps, startingPoint, {}));

    const { timers, updates: updatesResult } = resultExecutingSteps.reduce((prevValue, { timers, updates }): IWorkflowProcess => {
        return {
            timers: [...(prevValue?.timers || []), ...timers],
            updates: { ...(prevValue?.updates || {}), ...updates },
        };
    }, { updates: updates, timers: [] } as IWorkflowProcess);

    const mapFromTimers = new Map(timers.map(timer => [timer.workflowStepId, timer]));
    const filteredTimers = [...mapFromTimers.values()];

    return { updatesResult, timers: filteredTimers };
}

function evaluateCondition(condition: ICondition, obj: ICardUpdates): boolean {
    return operatorFunctions[condition.operator](obj[condition.attribute], condition.value);
}

function isCondition(condition: any): condition is ICondition {
    return !!condition.attribute;
}

function evaluateConditionGroup(group: IConditionConfig, obj: ICardUpdates): boolean {
    if (group.operator === 'and') {
        return group.conditions.every(cond =>
            isCondition(cond) ? evaluateCondition(cond, obj) : evaluateConditionGroup(cond, obj)
        );
    } else { // 'or' operator
        return group.conditions.some(cond =>
            isCondition(cond) ? evaluateCondition(cond, obj) : evaluateConditionGroup(cond, obj)
        );
    }
}
