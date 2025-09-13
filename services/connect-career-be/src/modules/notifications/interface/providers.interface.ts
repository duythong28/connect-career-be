export interface Providers {
    sendNotification(recipient: string, message: string): Promise<void>;
    scheduleNotification(recipient: string, message: string, scheduleTime: Date): Promise<void>;
    validateRecipient(recipient: string): boolean;
}