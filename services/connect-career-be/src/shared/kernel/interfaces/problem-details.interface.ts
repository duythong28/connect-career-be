/**
 * Represents a Problem Details object as defined in RFC 7807
 * @see https://tools.ietf.org/html/rfc7807
 */
export interface ProblemDetails {
  /**
   * A URI reference that identifies the problem type
   */
  type: string;

  /**
   * A short, human-readable summary of the problem type
   */
  title: string;

  /**
   * The HTTP status code
   */
  status: number;

  /**
   * A human-readable explanation specific to this occurrence of the problem
   */
  detail: string;

  /**
   * A URI reference that identifies the specific occurrence of the problem
   */
  instance: string;

  /**
   * Additional error details specific to the problem
   */
  errors?: Record<string, string[]>;

  /**
   * A unique identifier for tracing the error
   */
  traceId?: string;

  /**
   * Additional data associated with the error
   */
  data?: any;
}
