export interface INotificationProvider {
  send(recipient: string, title: string, message: string): Promise<void>;
}
