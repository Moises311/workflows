import { IWorkflowStep } from "./workflows";

export interface IAction {
    /**
         * @description The type of action to apply\
         * stage - change the stage of the card\
         * message - send a message to the user\
         * data - change the data on the card\
         * points - change the points on the card\
         * integration - call an external api (serves as a webhook)
         */
    changeType: "stage" | "message" | "data" | "points" | "integration",
    /**
     * @description The type of action to apply\
     * fixed - set the value to the newValue\
     * increment - increment the value by the newValue\
     */
    actionType?: "fixed" | "increment",
    /**
     * @description If data, the attribute to change if newValue is not a Partial<IWalletPassInput>
     */
    attribute?: string,
    /**
     * @description If data, the path to attribute to change if newValue is not a Partial<IWalletPassInput>
     */
    path?: string,
    /**
     * @description The new value used to change the card\
     * changeType - fixed - the new value to set\
     * changeType - increment - the value to increment by
     */
    newValue?: any,
}

export interface IActionStep extends IWorkflowStep {
    data: IAction;
}
