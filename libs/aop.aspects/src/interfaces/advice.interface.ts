import { IJoinPoint } from '@nestjslatam/aop';

/** TypeScript port of `BeyondNet.Aop.Aspects.IAdvice`. */
export interface IAdvice {
  onEntry(joinPoint: IJoinPoint, context?: any[]): void;

  onSuccess(joinPoint: IJoinPoint, context?: any[]): void;

  onExit(joinPoint: IJoinPoint, context?: any[]): void;

  onException(
    joinPoint: IJoinPoint,
    context: any[] | undefined,
    error: any,
  ): void;
}

export type AdviceToken = string | symbol | (new (...args: any[]) => IAdvice);

export type AdviceResolver = (token: AdviceToken) => IAdvice;
