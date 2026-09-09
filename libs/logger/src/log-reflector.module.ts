import { DynamicModule, Module } from '@nestjs/common';

import { IOptions, IOptionsAsync } from './interfaces';
import { ReflectorBuilder } from './reflectors';

/**
 * v1 entry point. Registers `AopModule` underneath, so `@LogMethod` keeps
 * working and `@Retry` / `@UseAdvice` become available without extra wiring.
 */
@Module({})
export class LogReflectorModule {
  static forRoot(options: IOptions): DynamicModule {
    return ReflectorBuilder.forRoot(options);
  }

  static forRootAsync(options: IOptionsAsync): DynamicModule {
    return ReflectorBuilder.forRootAsync(options);
  }
}
