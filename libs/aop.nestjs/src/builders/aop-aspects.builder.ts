import { Provider, Type } from '@nestjs/common';
import { IAspect } from '@nestjslatam/aop';
import { IAdvice, IAopLogger } from '@nestjslatam/aop.aspects';

import { IAopAspectsBuilder } from '../interfaces';

/**
 * TypeScript port of `AopAspectsBuilder`.
 * .NET registers every implementation with keyed DI; NestJS has no keyed
 * container, so each class is registered under its own type token and resolved
 * later through `ModuleRef`.
 */
export class AopAspectsBuilder implements IAopAspectsBuilder {
  readonly providers: Provider[] = [];
  readonly aspectTokens: Type<IAspect>[] = [];
  defaultLogger?: Type<IAopLogger>;

  addAspect(aspect: Type<IAspect>): IAopAspectsBuilder {
    this.register(aspect);
    this.aspectTokens.push(aspect);

    return this;
  }

  addAdvice(advice: Type<IAdvice>): IAopAspectsBuilder {
    this.register(advice);

    return this;
  }

  /**
   * Registers a sink AND makes it the default one.
   *
   * It used to only register the class, so `addLogger(MySink)` left every
   * `@LogMethod()` writing through `NestLoggerSink` until each decorator also
   * named the sink. Nothing failed; the entries just came out in the wrong
   * shape, which is worse. The last call wins.
   */
  addLogger(logger: Type<IAopLogger>): IAopAspectsBuilder {
    this.register(logger);
    this.defaultLogger = logger;

    return this;
  }

  private register(type: Type<any>): void {
    const registered = this.providers.some(
      (provider) => provider === type || (provider as any)?.provide === type,
    );

    if (!registered) this.providers.push(type);
  }
}
