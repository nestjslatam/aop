import { IAspectExecutor } from '@nestjslatam/aop';

/**
 * Fallback used by the decorators when the decorated class is not managed by
 * the NestJS container (plain classes, unit tests). `AopModule` registers the
 * executor here on start up.
 */
export class AopRegistry {
  private static executor: IAspectExecutor | undefined;

  static set(executor: IAspectExecutor): void {
    AopRegistry.executor = executor;
  }

  static get(): IAspectExecutor | undefined {
    return AopRegistry.executor;
  }

  static reset(): void {
    AopRegistry.executor = undefined;
  }
}
