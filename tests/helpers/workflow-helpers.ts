import { randomUUID } from "crypto";
import { IAction, IActionStep, IConditionConfig, IConditionGroupConfig, IConditionGroupStep, IConditionStep, ITimer, ITimerStep, TWorkflowSteps, WorkflowStepType } from "../../src/interfaces";
import { isTimerStep } from "../../src/workflows/workflow-steps";

export function getConditionGroup(conditionGroupConfig: IConditionGroupConfig, options?: { initialStep: boolean }): Required<IConditionGroupStep> {
    const { initialStep } = options || {};
    const uuid = randomUUID();
    return {
        data: conditionGroupConfig,
        defaultStepIds: [],
        followingStepIds: [],
        stepType: WorkflowStepType.CONDITION_GROUP,
        workflowStepId: uuid,
        isInitialStep: initialStep,
    } as any
}

export function getCondition(condition: IConditionConfig, options: { sequence: number }): Required<IConditionStep> {
    const uuid = randomUUID();
    return {
        data: condition,
        followingStepIds: [],
        stepType: WorkflowStepType.CONDITION,
        workflowStepId: uuid,
        sequence: options.sequence,
    } as any;
}


export function getAction(actionData: IAction, options?: { initialStep: boolean }): Required<IActionStep> {
    const { initialStep } = options || {};
    const uuid = randomUUID();
    return {
        data: actionData,
        followingStepIds: [],
        workflowStepId: uuid,
        isInitialStep: initialStep,
        stepType: WorkflowStepType.ACTION
    } as any;
}

export function getTimer(timerData: ITimer, options?: { initialStep: boolean }): Required<ITimerStep> {
    const { initialStep } = options || {};
    const uuid = randomUUID();

    return {
        data: timerData,
        followingStepIds: [],
        stepType: WorkflowStepType.TIMER,
        isInitialStep: initialStep,
        workflowStepId: uuid,
    } as any;
}

export function getWorkflowSteps(): TWorkflowSteps[] {
    const initialActionStep = getAction({ changeType: "message", newValue: "Welcome to our store" }, { initialStep: true });
    const conditionGroup = getConditionGroup({ runAllValidCriteria: false });
    const defaultCaseAction = getAction({ changeType: "message", newValue: "Sorry you don't have enough points to participate" });
    const condition1 = getCondition({
        operator: "and",
        conditions: [
            {
                value: "200",
                operator: "gt",
                attribute: "points"
            },
            {
                value: "999",
                operator: "le",
                attribute: "points"
            }
        ]
    }, { sequence: 1 });

    const actionCondition1 = getAction({ changeType: "message", newValue: "Congrats! You'll receive a reward in a few minutes" });
    const timer1 = getTimer({ when: "5m" });
    const action1Timer1 = getAction({ changeType: "message", newValue: "You earned 100 points!" });
    const action2Timer1 = getAction({ changeType: "points", actionType: "increment", newValue: 100 });

    const condition2 = getCondition({
        operator: "and",
        conditions: [{
            value: "999",
            operator: "gt",
            attribute: "points"
        }]
    }, { sequence: 2 });
    const actionCondition2 = getAction({ changeType: "message", newValue: "We will take some of your points because you are probably cheating 🧐" });
    const timer2 = getTimer({ when: "1m" });

    initialActionStep.followingStepIds.push(conditionGroup.workflowStepId);
    conditionGroup.followingStepIds.push(condition1.workflowStepId, condition2.workflowStepId);
    conditionGroup.defaultStepIds.push(defaultCaseAction.workflowStepId);

    condition1.followingStepIds.push(actionCondition1.workflowStepId);
    actionCondition1.followingStepIds.push(timer1.workflowStepId);
    timer1.followingStepIds.push(action1Timer1.workflowStepId, action2Timer1.workflowStepId);

    condition2.followingStepIds.push(actionCondition2.workflowStepId);
    actionCondition2.followingStepIds.push(timer2.workflowStepId);
    timer2.followingStepIds.push();

    return [
        initialActionStep,
        conditionGroup,
        defaultCaseAction,
        condition1,
        condition2,
        actionCondition1,
        timer1,
        action1Timer1,
        action2Timer1,
        actionCondition2,
        timer2,
    ];
}

export function getUpdatedWorkflowSteps(): TWorkflowSteps[] {
    // Add action after second timer.
    const actionTimer2 = getAction({ changeType: "message", newValue: "Just kidding! 😄" });

    const currentWorkflowSteps = getWorkflowSteps();
    const timerStep = currentWorkflowSteps.find(ws => isTimerStep(ws) && ws.data.when === "1m");
    timerStep?.followingStepIds?.push(actionTimer2.workflowStepId);

    return [
        ...currentWorkflowSteps,
        actionTimer2,
    ];
}

