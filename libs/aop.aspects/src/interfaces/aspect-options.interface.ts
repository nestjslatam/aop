import { IAspectOptions, IJoinPoint } from '@nestjslatam/aop';

import { AopLoggerToken } from './aop-logger.interface';
import { AdviceToken } from './advice.interface';

export interface ILoggerAspectOptions extends IAspectOptions {
  /**
   * Business name for this join point, handed to the sink as `context.name`.
   *
   * Without it a sink can only say `TargetType.method`, which is where the code
   * lives, not what the system was doing. `@Trace` already takes one; this is
   * the same idea for logs, so a trace and its lines can carry one vocabulary.
   */
  name?: string;
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
  /**
   * Decides per error whether another attempt is worth it.
   *
   * `errorTypes` cannot express a driver that reports every failure through a
   * single class: a SQL Server deadlock and a duplicate key both arrive as the
   * same `RequestError` and are told apart by a numeric code. Retrying the
   * duplicate key would write twice.
   *
   * Both filters must pass when both are given, so adding one never silently
   * widens the other. `attempt` is zero-based.
   */
  shouldRetry?: (error: any, attempt: number) => boolean;
  /** `true` swallows the error once the attempts are exhausted. */
  handleException?: boolean;
}

export interface IAdviceAspectOptions extends IAspectOptions {
  advice: AdviceToken;
  handleException?: boolean;
  context?: any[];
}
