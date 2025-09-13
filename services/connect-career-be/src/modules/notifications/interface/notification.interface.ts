export interface Notification {
    id: string;
    title: string;
    message: string;
    recipient: string;
    channel: string;
    createdAt: Date;
    updatedAt: Date;
}