import { IMetadata, Parameter, Result } from '@nestjslatam/aop.aspects';

import { IOptions } from './option.interface';

/**
 * Logging contract published by `@nestjslatam/logreflector-lib` v1.
 * Kept untouched for backwards compatibility; new sinks should implement
 * `IAopLogger` from `@nestjslatam/aop.aspects` instead.
 */
export interface ILogReflector {
  getOptions(): IOptions;

  OnEntry(metadata: IMetadata, parameters?: Parameter[]): void;

  OnException(metadata: IMetadata, ex: Error): void;

  OnCall(metadata: IMetadata, result: Result): void;

  OnExit(metadata: IMetadata): void;
}
