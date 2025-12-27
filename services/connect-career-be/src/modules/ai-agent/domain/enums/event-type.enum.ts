/**
 * Event types for episodic memory
 * Represents different types of events that can be stored in episodic memory
 */
export enum EventType {
  /** User message event */
  USER_MESSAGE = 'user_message',

  /** Assistant/AI response event */
  ASSISTANT_MESSAGE = 'assistant_message',

  /** System message event */
  SYSTEM_MESSAGE = 'system_message',

  /** Chat session creation event */
  CHAT_SESSION_CREATED = 'chat_session_created',
}
