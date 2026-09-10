export interface IMetadata {
  targetType: string;
  methodInfo: string;
  descriptor?: any;
  targetObject?: any;
  trackingId?: string;
  requestId?: string;
}

export interface ILogContext extends IMetadata {
  /** Business name declared with `@LogMethod({ name })`, when there is one. */
  name?: string;
  /** Elapsed milliseconds since the call started. */
  duration?: number;
  /** W3C trace correlation ids, present when a tracing aspect is active. */
  traceId?: string;
  spanId?: string;
}
