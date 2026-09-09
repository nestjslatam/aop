import { Parameter, Result } from '../models';
import { ILogContext } from './metadata.interface';

/**
 * Logging sink used by `LoggerAspect`.
 * TypeScript port of `BeyondNet.Aop.Aspects.ILogger`, collapsed into the four
 * phases already modelled by `eLogType` instead of the six .NET overloads.
 */
export interface IAopLogger {
  onEntry(context: ILogContext, parameters?: Parameter[]): void;

  onCall(context: ILogContext, result: Result): void;

  onExit(context: ILogContext): void;

  onException(context: ILogContext, error: Error): void;
}

export type AopLoggerToken =
  | string
  | symbol
  | (new (...args: any[]) => IAopLogger);

export type AopLoggerResolver = (token?: AopLoggerToken) => IAopLogger;
