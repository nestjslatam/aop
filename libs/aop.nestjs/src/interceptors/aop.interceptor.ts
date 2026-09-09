import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import {
  AspectMetadataHelper,
  IAspectExecutor,
  JoinPoint,
} from '@nestjslatam/aop';
import { from, isObservable, Observable, of } from 'rxjs';

import { AOP_EXECUTOR } from '../constants';

/**
 * Runs the aspects declared with `useInterceptor: true` on controller and
 * resolver handlers, where the `ExecutionContext` carries the transport data.
 *
 * Handlers already wrapped by a decorator are skipped: the wrapper runs the
 * same chain when the method is invoked, so intercepting again would duplicate
 * every log entry.
 */
@Injectable()
export class AopInterceptor implements NestInterceptor {
  constructor(
    @Inject(AOP_EXECUTOR) private readonly executor: IAspectExecutor,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const handler = context.getHandler();
    const target = context.getClass();

    if (AspectMetadataHelper.isWrapped(handler)) return next.handle();

    if (!AspectMetadataHelper.has(target.prototype, handler.name)) {
      return next.handle();
    }

    const joinPoint = new JoinPoint({
      args: context.getArgs(),
      methodInfo: {
        name: handler.name,
        parameterTypes: AspectMetadataHelper.getParameterTypes(
          target.prototype,
          handler.name,
        ),
        returnType: AspectMetadataHelper.getReturnType(
          target.prototype,
          handler.name,
        ),
      },
      targetObject: target.prototype,
      targetType: target.name,
      requestId: this.getRequestId(context),
      invoke: () => next.handle(),
    });

    const result = this.executor.execute(joinPoint);

    if (isObservable(result)) return result;

    return result && typeof result.then === 'function'
      ? from(result)
      : of(result);
  }

  private getRequestId(context: ExecutionContext): string | undefined {
    if (context.getType() !== 'http') return undefined;

    const request = context.switchToHttp().getRequest();

    return request?.headers?.['x-request-id'];
  }
}
