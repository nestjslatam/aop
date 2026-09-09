import { IMethodInfo } from './method-info.interface';

/**
 * Runtime information of the intercepted call.
 * TypeScript port of `BeyondNet.Aop.IJoinPoint`.
 */
export interface IJoinPoint {
  args: any[];
  returnValue: any;
  readonly methodInfo: IMethodInfo;
  readonly targetObject: any;
  readonly targetType: string;
  /** Milliseconds elapsed since the join point was created. */
  readonly elapsedMs: number;
  trackingId?: string;
  requestId?: string;
  /** W3C trace correlation ids, filled by a tracing aspect when one is active. */
  traceId?: string;
  spanId?: string;
  /** Invokes the intercepted method. May return a value, a Promise or an Observable. */
  proceed(): any;
}
