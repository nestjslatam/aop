import { Logger, LoggerService } from '@nestjs/common';
import {
  IAopLogger,
  ILogContext,
  Parameter,
  Result,
} from '@nestjslatam/aop.aspects';

import { TemplateHelper } from '../helpers';
import { ISerializer } from '../serializers';
import {
  ON_CALL_TEMPLATE,
  ON_CALL_TEMPLATE_TRACKING,
  ON_ENTRY_TEMPLATE,
  ON_ENTRY_TEMPLATE_TRACKING,
  ON_EXCEPTION_TEMPLATE,
  ON_EXCEPTION_TEMPLATE_TRACKING,
  ON_EXIT_TEMPLATE,
  ON_EXIT_TEMPLATE_TRACKING,
} from '../templates';

/**
 * Equivalent of `BeyondNet.Aop.Aspects.Logger.CommonLoggingLogger`, writing
 * through the `Logger` that NestJS already provides instead of Common.Logging.
 */
export class NestLoggerSink implements IAopLogger {
  protected readonly logger: LoggerService;

  constructor(
    protected readonly serializer: ISerializer,
    context: string = NestLoggerSink.name,
    logger?: LoggerService,
  ) {
    this.logger = logger ?? new Logger(context);
  }

  /** Appends the trace correlation ids when a tracing aspect filled them. */
  protected withTrace(message: string, context: ILogContext): string {
    return context.traceId
      ? `${message} [TraceId: ${context.traceId}, SpanId: ${context.spanId}]`
      : message;
  }

  onEntry(context: ILogContext, parameters?: Parameter[]): void {
    const template = context.trackingId
      ? ON_ENTRY_TEMPLATE_TRACKING
      : ON_ENTRY_TEMPLATE;

    const params = parameters?.length
      ? this.serializer.serialize(parameters)
      : undefined;

    this.logger.log(
      this.withTrace(
        TemplateHelper.build(template, context, {
          params,
          duration: context.duration,
        }),
        context,
      ),
    );
  }

  onCall(context: ILogContext, result: Result): void {
    const template = context.trackingId
      ? ON_CALL_TEMPLATE_TRACKING
      : ON_CALL_TEMPLATE;

    const value = this.serializer.serialize(result.value);

    this.logger.log(
      this.withTrace(
        TemplateHelper.build(template, context, {
          duration: context.duration,
          returnedValue: value ? `${result.type}, ${value}` : undefined,
        }),
        context,
      ),
    );
  }

  onExit(context: ILogContext): void {
    const template = context.trackingId
      ? ON_EXIT_TEMPLATE_TRACKING
      : ON_EXIT_TEMPLATE;

    this.logger.log(
      this.withTrace(
        TemplateHelper.build(template, context, { duration: context.duration }),
        context,
      ),
    );
  }

  onException(context: ILogContext, error: Error): void {
    const template = context.trackingId
      ? ON_EXCEPTION_TEMPLATE_TRACKING
      : ON_EXCEPTION_TEMPLATE;

    const message = this.withTrace(
      TemplateHelper.build(template, context, {
        duration: context.duration,
        error: error?.message ?? String(error),
      }),
      context,
    );

    this.logger.error(message, error?.stack, context.targetType);
  }
}
