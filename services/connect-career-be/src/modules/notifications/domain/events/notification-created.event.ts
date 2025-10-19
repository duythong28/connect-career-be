export class NotificationCreatedEvent {
  constructor(
    public readonly notificationId: string,
    public readonly recipient: string,
    public readonly channel: string,
    public readonly message: string,
    public readonly createdAt: Date = new Date(),
  ) {}
}
