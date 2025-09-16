export class ChannelValueObject {
  private readonly channel: string;

  constructor(channel: string) {
    this.validateChannel(channel);
    this.channel = channel;
  }

  private validateChannel(channel: string): void {
    const validChannels = ['email', 'sms', 'websocket'];
    if (!validChannels.includes(channel)) {
      throw new Error(
        `Invalid channel: ${channel}. Valid channels are: ${validChannels.join(', ')}`,
      );
    }
  }

  public get value(): string {
    return this.channel;
  }
}
