import { IWorkflowStep } from "./workflows";

export interface ITimer {
    when: "now" | Date | `${number}d` | `${number}h` | `${number}m`;
}

export interface ITimerStep extends IWorkflowStep {
    data: ITimer;
}
