import {
  IAopLogger,
  ILogContext,
  IMetadata,
  Parameter,
  Result,
} from '@nestjslatam/aop.aspects';
import { ISerializer, NestLoggerSink } from '@nestjslatam/aop.aspects.logger';

import { ILogReflector, IOptions } from '../interfaces';

/**
 * Default sink of `@nestjslatam/logreflector-lib` v1.
 * Formatting now lives in `NestLoggerSink`; this class only keeps the v1
 * PascalCase surface and the `getOptions()` accessor.
 */
export class LogReflectorDefault
  extends NestLoggerSink
  implements ILogReflector, IAopLogger
{
  constructor(serializer: ISerializer, private readonly options: IOptions) {
    super(serializer, LogReflectorDefault.name);
  }

  getOptions(): IOptions {
    if (this.options) return this.options;

    throw new Error('Options were not available. Please enable it first.');
  }

  OnEntry(metadata: IMetadata, parameters?: Parameter[]): void {
    this.onEntry(metadata as ILogContext, parameters);
  }

  OnException(metadata: IMetadata, ex: Error): void {
    this.onException(metadata as ILogContext, ex);
  }

  OnCall(metadata: IMetadata, result: Result): void {
    this.onCall(metadata as ILogContext, result);
  }

  OnExit(metadata: IMetadata): void {
    this.onExit(metadata as ILogContext);
  }
}
