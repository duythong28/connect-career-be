export function formatNotificationMessage(template: string, data: Record<string, any>): string {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || '');
}

export function formatNotificationResponse(status: string, message: string, data?: any): Record<string, any> {
    return {
        status,
        message,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data,
    };
}