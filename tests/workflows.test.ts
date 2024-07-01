import { randomUUID } from "crypto";
import { ICardUpdates, TWorkflowSteps } from "../src/interfaces";
import { inMemoryStorage } from "../src/storage";
import { patchWorkflowSteps, postWorkflowSteps, runWorkflow } from "../src/workflows/workflows";
import { getUpdatedWorkflowSteps, getWorkflowSteps } from "./helpers";

describe("Workflows", () => {
    let workflowId: string;
    let initialCardDataFirstCase: ICardUpdates = { message: "Hi!", points: 240 };
    let initialCardDataSecondCase: ICardUpdates = { message: "Welcome to gold tier!", points: 1400 };

    it("Create workflow steps", async () => {
        workflowId = randomUUID();
        const workflowStepsToCreate = getWorkflowSteps();

        await postWorkflowSteps(workflowId, workflowStepsToCreate);

        const workflowSteps = inMemoryStorage.find("workflowSteps", {});
        const workflowStepConnections = inMemoryStorage.find("workflowStepConnections", {});

        expect(workflowSteps.length).toBe(11);
        expect(workflowStepConnections.length).toBe(11);
    });

    it("Update workflow steps", async () => {
        const workflowStepsToUpdate = getUpdatedWorkflowSteps();

        await patchWorkflowSteps(workflowId, workflowStepsToUpdate);

        const workflowSteps = inMemoryStorage.find("workflowSteps", {});
        const workflowStepConnections = inMemoryStorage.find("workflowStepConnections", {});

        expect(workflowSteps.length).toBe(12);
        expect(workflowStepConnections.length).toBe(12);
    });

    it("Execute workflow - default case", async () => {
        const workflowSteps = inMemoryStorage.find<TWorkflowSteps>("workflowSteps", { workflowId });
        const { updatesResult, timers } = await runWorkflow(workflowSteps, { points: 120 });

        expect(updatesResult).toBeDefined();
        expect(updatesResult).toHaveProperty("message");
        expect(updatesResult.message).toBe("Sorry you don't have enough points to participate");

        expect(timers).toBeDefined();
        expect(timers.length).toBe(0);
    });

    describe("First condition - points > 200 && points <= 999", () => {
        let cardData = { points: 240, message: "Hello!" };
        let timerStepIds: string[] = [];
        let workflowSteps: TWorkflowSteps[];

        it("Execute workflow - first condition", async () => {
            workflowSteps = inMemoryStorage.find<TWorkflowSteps>("workflowSteps", { workflowId });
            const { updatesResult, timers } = await runWorkflow(workflowSteps, cardData);

            console.log(updatesResult, timers);
            expect(updatesResult).toBeDefined();
            expect(updatesResult).toHaveProperty("message");
            expect(updatesResult.message).toBe("Congrats! You'll receive a reward in a few minutes");
            cardData = { ...cardData, ...updatesResult}

            expect(timers).toBeDefined();
            expect(timers.length).toBe(1);
            timerStepIds = timers.map(t => t.workflowStepId);
        });

        it("Execute pending steps", async () => {
            const { updatesResult, timers } = await runWorkflow(workflowSteps, cardData, timerStepIds);

            console.log(updatesResult, timers);
            expect(updatesResult).toBeDefined();
            expect(updatesResult).toHaveProperty("message");
            expect(updatesResult).toHaveProperty("points");
            expect(updatesResult.message).toBe("You earned 100 points!");
            expect(updatesResult.points).toBe(cardData.points + 100);
            cardData = { ...cardData, ...updatesResult}
        });
    });

    describe("Second condition - points > 999", () => {
        let cardData = { points: 1400, message: "Hello!" };
        let timerStepIds: string[] = [];
        let workflowSteps: TWorkflowSteps[];

        it("Execute workflow - second condition", async () => {
            workflowSteps = inMemoryStorage.find<TWorkflowSteps>("workflowSteps", { workflowId });
            const { updatesResult, timers } = await runWorkflow(workflowSteps, cardData);

            console.log(updatesResult, timers);
            expect(updatesResult).toBeDefined();
            expect(updatesResult).toHaveProperty("message");
            expect(updatesResult.message).toBe("We will take some of your points because you are probably cheating 🧐");
            cardData = { ...cardData, ...updatesResult}

            expect(timers).toBeDefined();
            expect(timers.length).toBe(1);
            timerStepIds = timers.map(t => t.workflowStepId);
        });

        it("Execute pending steps", async () => {
            const { updatesResult, timers } = await runWorkflow(workflowSteps, cardData, timerStepIds);

            console.log(updatesResult, timers);
            expect(updatesResult).toBeDefined();
            expect(updatesResult).toHaveProperty("message");
            expect(updatesResult.message).toBe("Just kidding! 😄");
            cardData = { ...cardData, ...updatesResult}
        });
    });
});
