import { IJoinPoint } from '@nestjslatam/aop';

import { IAdvice } from '../interfaces';

/**
 * TypeScript port of `BeyondNet.Aop.Aspects.Advice`.
 * The .NET version assigns `default(T)` to the return value of value types on
 * error; TypeScript has no such notion, so the return value is left untouched.
 */
export class Advice implements IAdvice {
  onEntry(joinPoint: IJoinPoint, context?: any[]): void {
    void joinPoint;
    void context;
  }

  onSuccess(joinPoint: IJoinPoint, context?: any[]): void {
    void joinPoint;
    void context;
  }

  onExit(joinPoint: IJoinPoint, context?: any[]): void {
    void joinPoint;
    void context;
  }

  onException(
    joinPoint: IJoinPoint,
    context: any[] | undefined,
    error: any,
  ): void {
    void joinPoint;
    void context;
    void error;
  }
}
