export class NotificationSentEvent {
  constructor(
    public readonly notificationId: string,
    public readonly recipient: string,
    public readonly channel: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}
