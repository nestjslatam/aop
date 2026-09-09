import {
  IAspectContext,
  IJoinPoint,
  OnMethodBoundaryAspect,
} from '@nestjslatam/aop';

import { ADVICE_ASPECT_TOKEN } from '../constants';
import { AdviceResolver, IAdvice, IAdviceAspectOptions } from '../interfaces';

interface IAdviceAspectContext extends IAspectContext<IAdviceAspectOptions> {
  state: { advice?: IAdvice };
}

/** TypeScript port of `BeyondNet.Aop.Aspects.AdviceAspect`. */
export class AdviceAspect extends OnMethodBoundaryAspect<
  IAdviceAspectOptions,
  IAdviceAspectContext
> {
  readonly token = ADVICE_ASPECT_TOKEN;

  constructor(private readonly resolveAdvice: AdviceResolver) {
    super();
  }

  protected init(joinPoint: IJoinPoint, context: IAdviceAspectContext): void {
    void joinPoint;

    const { advice, handleException } = context.options;

    if (!advice) {
      throw new Error('AdviceAspect: the "advice" option is required.');
    }

    const resolved = this.resolveAdvice(advice);

    if (!resolved) {
      throw new Error(
        `AdviceAspect: no advice registered for "${String(
          advice,
        )}". Register it with AopAspectsBuilder.addAdvice().`,
      );
    }

    context.state.advice = resolved;
    context.handleException = handleException === true;
  }

  protected onEntry(
    joinPoint: IJoinPoint,
    context: IAdviceAspectContext,
  ): void {
    context.state.advice?.onEntry(joinPoint, context.options.context);
  }

  protected onSuccess(
    joinPoint: IJoinPoint,
    context: IAdviceAspectContext,
  ): void {
    context.state.advice?.onSuccess(joinPoint, context.options.context);
  }

  protected onExit(joinPoint: IJoinPoint, context: IAdviceAspectContext): void {
    context.state.advice?.onExit(joinPoint, context.options.context);
  }

  protected onException(
    joinPoint: IJoinPoint,
    context: IAdviceAspectContext,
    error: any,
  ): void {
    context.state.advice?.onException(
      joinPoint,
      context.options.context,
      error,
    );
  }
}
