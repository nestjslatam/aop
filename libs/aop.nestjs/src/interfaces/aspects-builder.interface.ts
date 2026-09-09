import { Provider, Type } from '@nestjs/common';
import { IAspect } from '@nestjslatam/aop';
import { IAdvice, IAopLogger } from '@nestjslatam/aop.aspects';

/** TypeScript port of `BeyondNet.Aop.Aspects.IAopAspectsBuilder`. */
export interface IAopAspectsBuilder {
  addAspect(aspect: Type<IAspect>): IAopAspectsBuilder;

  addAdvice(advice: Type<IAdvice>): IAopAspectsBuilder;

  addLogger(logger: Type<IAopLogger>): IAopAspectsBuilder;

  readonly providers: Provider[];

  readonly aspectTokens: Type<IAspect>[];
}
