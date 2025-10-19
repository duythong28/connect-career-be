export class UserRegisteredEvent {
  constructor(
    public readonly firstName: string,
    public readonly userId: string,
    public readonly email: string,
    public readonly token: string,
    public readonly expiresAt: Date,
  ) {}
}
