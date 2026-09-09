import { IAspectOptions, IJoinPoint } from '@nestjslatam/aop';

import { AopLoggerToken } from './aop-logger.interface';
import { AdviceToken } from './advice.interface';

export interface ILoggerAspectOptions extends IAspectOptions {
  /** Sink to log with. Defaults to the one registered as `AOP_LOGGER`. */
  logger?: AopLoggerToken;
  /** `true` logs every argument, an array of indexes logs only those. */
  logArguments?: boolean | number[];
  logReturn?: boolean;
  logDuration?: boolean;
  /** `false` lets the exception through without logging it. Defaults to `true`. */
  logException?: boolean;
  trackingId?: string;
  requestId?: string;
  /**
   * Replaces the `Expression` string of the .NET version, which needed a
   * dynamic expression parser. Runs against the invocation arguments.
   */
  resolveRequestId?: (args: any[], joinPoint: IJoinPoint) => string;
}

export interface IRetryAspectOptions extends IAspectOptions {
  /** Extra attempts after the first failure. Defaults to `3`. */
  maxAttempts?: number;
  /** Delay before each retry. Requires an async or Observable method. */
  delayMs?: number;
  backoff?: 'fixed' | 'exponential';
  /** Retry only these error types. Retries every error when omitted. */
  errorTypes?: Array<new (...args: any[]) => Error>;
  /** `true` swallows the error once the attempts are exhausted. */
  handleException?: boolean;
}

export interface IAdviceAspectOptions extends IAspectOptions {
  advice: AdviceToken;
  handleException?: boolean;
  context?: any[];
}
