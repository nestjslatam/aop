import {
  IAopLogger,
  ILogContext,
  Parameter,
  Result,
} from '@nestjslatam/aop.aspects';
import { ISerializer, JsonSerializer } from '@nestjslatam/aop.aspects.logger';
import pino, { Logger } from 'pino';

import {
  ON_CALL_MESSAGE,
  ON_ENTRY_MESSAGE,
  ON_EXCEPTION_MESSAGE,
  ON_EXIT_MESSAGE,
} from '../constants';

/** Structured fields written on every phase. */
export interface IPinoLogFields {
  className: string;
  methodName: string;
  requestId?: string;
  trackingId?: string;
  duration?: number;
  traceId?: string;
  spanId?: string;
  arguments?: string;
  return?: string;
}

/**
 * Port of `BeyondNet.Aop.Aspects.Logger.Serilog.SerilogLogger`.
 *
 * Serilog attaches the payload as context (`Log.ForContext("Return", ...)`) and
 * leaves the message as a template; pino receives the payload as the first
 * argument and the message as the second, which is the same split.
 *
 * The values are serialized before being attached so `@LogSensitiveParam` and
 * `SensitiveDataJsonSerializer` keep masking what they must.
 */
export class PinoSink implements IAopLogger {
  private readonly logger: Logger;

  private readonly serializer: ISerializer;

  constructor(serializer: ISerializer = new JsonSerializer(), logger?: Logger) {
    this.serializer = serializer;
    this.logger = logger ?? pino();
  }

  onEntry(context: ILogContext, parameters?: Parameter[]): void {
    this.logger.debug(
      {
        ...this.getFields(context),
        arguments: parameters?.length
          ? this.serializer.serialize(parameters)
          : undefined,
      },
      ON_ENTRY_MESSAGE,
    );
  }

  onCall(context: ILogContext, result: Result): void {
    this.logger.debug(
      {
        ...this.getFields(context),
        returnType: result?.type,
        return: this.serializer.serialize(result?.value),
      },
      ON_CALL_MESSAGE,
    );
  }

  onExit(context: ILogContext): void {
    this.logger.debug(this.getFields(context), ON_EXIT_MESSAGE);
  }

  onException(context: ILogContext, error: Error): void {
    this.logger.error(
      { ...this.getFields(context), err: error },
      ON_EXCEPTION_MESSAGE,
    );
  }

  private getFields(context: ILogContext): IPinoLogFields {
    return {
      className: context.targetType,
      methodName: context.methodInfo,
      requestId: context.requestId,
      trackingId: context.trackingId,
      traceId: context.traceId,
      spanId: context.spanId,
      duration: context.duration,
    };
  }
}
