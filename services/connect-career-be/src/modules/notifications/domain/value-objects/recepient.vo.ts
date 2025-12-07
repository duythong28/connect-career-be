export class RecipientValueObject {
  private readonly email?: string;
  private readonly phoneNumber?: string;
  private readonly websocketId?: string;

  constructor(email?: string, phoneNumber?: string, websocketId?: string) {
    this.email = email;
    this.phoneNumber = phoneNumber;
    this.websocketId = websocketId;
  }

  public getEmail(): string | undefined {
    return this.email;
  }

  public getPhoneNumber(): string | undefined {
    return this.phoneNumber;
  }

  public getWebSocketId(): string | undefined {
    return this.websocketId;
  }

  public isValid(): boolean {
    return !!(this.email || this.phoneNumber || this.websocketId);
  }
}
