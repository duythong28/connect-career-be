export function getNotificationProvider(channel: string) {
    switch (channel) {
        case 'smtp':
            return 'SmtpProvider';
        case 'sms':
            return 'SmsProvider';
        case 'websocket':
            return 'WebSocketProvider';
        default:
            throw new Error(`No provider found for channel: ${channel}`);
    }
}

export function isValidChannel(channel: string): boolean {
    const validChannels = ['smtp', 'sms', 'websocket'];
    return validChannels.includes(channel);
}