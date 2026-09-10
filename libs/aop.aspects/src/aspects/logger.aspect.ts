import {
  IAspectContext,
  IJoinPoint,
  OnMethodBoundaryAspect,
} from '@nestjslatam/aop';

import { LOGGER_ASPECT_TOKEN } from '../constants';
import {
  AopLoggerResolver,
  IAopLogger,
  ILogContext,
  ILoggerAspectOptions,
} from '../interfaces';
import { MetadataHelper } from '../helpers';
import { Result } from '../models';

interface ILoggerAspectContext extends IAspectContext<ILoggerAspectOptions> {
  state: {
    logger?: IAopLogger;
    metadata?: ILogContext;
  };
}

/** TypeScript port of `BeyondNet.Aop.Aspects.LoggerAspect`. */
export class LoggerAspect extends OnMethodBoundaryAspect<
  ILoggerAspectOptions,
  ILoggerAspectContext
> {
  readonly token = LOGGER_ASPECT_TOKEN;

  constructor(private readonly resolveLogger: AopLoggerResolver) {
    super();
  }

  protected init(joinPoint: IJoinPoint, context: ILoggerAspectContext): void {
    const { options } = context;

    context.handleException = options.logException !== false;
    context.state.logger = this.resolveLogger(options.logger);

    const requestId =
      options.resolveRequestId?.(joinPoint.args, joinPoint) ??
      options.requestId;

    joinPoint.requestId = requestId ?? joinPoint.requestId;
    joinPoint.trackingId = options.trackingId ?? joinPoint.trackingId;

    context.state.metadata = {
      ...MetadataHelper.fromJoinPoint(joinPoint),
      name: options.name,
    };
  }

  protected onEntry(
    joinPoint: IJoinPoint,
    context: ILoggerAspectContext,
  ): void {
    const { logArguments } = context.options;

    if (logArguments === false) {
      context.state.logger?.onEntry(this.getMetadata(joinPoint, context));

      return;
    }

    const parameters = MetadataHelper.getParameters(
      this.getMetadata(joinPoint, context),
      joinPoint.args,
    ).filter((parameter) =>
      Array.isArray(logArguments)
        ? logArguments.includes(parameter.index)
        : true,
    );

    context.state.logger?.onEntry(
      this.getMetadata(joinPoint, context),
      parameters,
    );
  }

  protected onSuccess(
    joinPoint: IJoinPoint,
    context: ILoggerAspectContext,
  ): void {
    const { logReturn, isFailure } = context.options;

    // `logReturn` decide si el VALOR se registra, no si la fase ocurre. Saltarse `onCall` dejaba
    // sin narrar la llamada completada a quien apagaba el retorno por no querer datos en el log.
    const metadata = this.getMetadata(joinPoint, context);
    const failed = isFailure?.(joinPoint.returnValue, joinPoint) === true;

    context.state.logger?.onCall(
      failed ? { ...metadata, failed } : metadata,
      new Result(
        joinPoint.methodInfo.returnType ?? joinPoint.methodInfo.name,
        logReturn === false ? undefined : joinPoint.returnValue,
      ),
    );
  }

  protected onExit(joinPoint: IJoinPoint, context: ILoggerAspectContext): void {
    context.state.logger?.onExit(this.getMetadata(joinPoint, context));
  }

  protected onException(
    joinPoint: IJoinPoint,
    context: ILoggerAspectContext,
    error: any,
  ): void {
    context.state.logger?.onException(
      this.getMetadata(joinPoint, context),
      error,
    );

    throw error;
  }

  private getMetadata(
    joinPoint: IJoinPoint,
    context: ILoggerAspectContext,
  ): ILogContext {
    const metadata =
      context.state.metadata ?? MetadataHelper.fromJoinPoint(joinPoint);

    return context.options.logDuration === false
      ? metadata
      : { ...metadata, duration: joinPoint.elapsedMs };
  }
}
