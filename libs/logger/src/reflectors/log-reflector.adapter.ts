import {
  IAopLogger,
  ILogContext,
  Parameter,
  Result,
} from '@nestjslatam/aop.aspects';

import { ILogReflector } from '../interfaces';

/** Lets a v1 `ILogReflector` be used as an `IAopLogger` sink. */
export class LogReflectorAdapter implements IAopLogger {
  constructor(private readonly reflector: ILogReflector) {}

  onEntry(context: ILogContext, parameters?: Parameter[]): void {
    this.reflector.OnEntry(context, parameters);
  }

  onCall(context: ILogContext, result: Result): void {
    this.reflector.OnCall(context, result);
  }

  onExit(context: ILogContext): void {
    this.reflector.OnExit(context);
  }

  onException(context: ILogContext, error: Error): void {
    this.reflector.OnException(context, error);
  }
}
