import { DynamicModule, Provider } from '@nestjs/common';
import { AopModule, IAopOptions } from '@nestjslatam/aop.nestjs';
import { RequestContextModule } from 'nestjs-request-context';

import {
  LOG_REFLECTOR_OPTIONS,
  LOG_REFLECTOR_OPTIONS_FACTORY,
} from '../constants';
import { IOptions, IOptionsAsync, IOptionsFactory } from '../interfaces';
import { LogReflectorModule } from '../log-reflector.module';
import { ReflectorFactory } from './reflector.factory';

const toAopOptions = (options?: IOptions): IAopOptions => ({
  behavior: { useProduction: options?.behavior?.useProduction === true },
  configuration: { serializer: 'json', output: 'console' },
});

export class ReflectorBuilder {
  public static forRoot(options: IOptions): DynamicModule {
    const useLogReflectorFactoryProvider: Provider[] = [
      {
        provide: LOG_REFLECTOR_OPTIONS,
        useValue: new ReflectorFactory(options).getLogger(),
      },
    ];

    return {
      module: LogReflectorModule,
      global: true,
      imports: [AopModule.forRoot(toAopOptions(options))],
      providers: [...useLogReflectorFactoryProvider],
      exports: [AopModule, ...useLogReflectorFactoryProvider],
    };
  }

  static forRootAsync(optionsAsync: IOptionsAsync): DynamicModule {
    const useLogReflectorFactoryProvider: Provider[] = [
      {
        provide: LOG_REFLECTOR_OPTIONS,
        useFactory: (options: IOptions) =>
          new ReflectorFactory(options).getLogger(),
        inject: [LOG_REFLECTOR_OPTIONS_FACTORY],
      },
    ];

    return {
      module: LogReflectorModule,
      global: true,
      imports: [
        RequestContextModule,
        AopModule.forRootAsync({
          imports: optionsAsync.imports ?? [],
          useFactory: optionsAsync.useFactory
            ? async (...args: any[]) =>
                toAopOptions(await optionsAsync.useFactory(...args))
            : undefined,
          useClass: optionsAsync.useClass,
          useExisting: optionsAsync.useExisting,
          inject: optionsAsync.inject ?? [],
          extraProviders: optionsAsync.extraProviders ?? [],
        }),
        ...(optionsAsync.imports ?? []),
      ],
      exports: [AopModule, ...useLogReflectorFactoryProvider],
      providers: [
        ...ReflectorBuilder.createAsyncProviders(optionsAsync),
        ...useLogReflectorFactoryProvider,
        ...(optionsAsync.extraProviders ?? []),
      ],
    };
  }

  private static createAsyncProviders(optionsAsync: IOptionsAsync): Provider[] {
    if (optionsAsync.useExisting || optionsAsync.useFactory) {
      return [this.createAsyncOptionsProvider(optionsAsync)];
    }

    return [
      this.createAsyncOptionsProvider(optionsAsync),
      {
        provide: optionsAsync.useClass,
        useClass: optionsAsync.useClass,
      },
    ];
  }

  private static createAsyncOptionsProvider(
    optionsAsync: IOptionsAsync,
  ): Provider {
    if (optionsAsync.useFactory) {
      return {
        provide: LOG_REFLECTOR_OPTIONS_FACTORY,
        useFactory: optionsAsync.useFactory,
        inject: optionsAsync.inject || [],
      };
    }

    return {
      provide: LOG_REFLECTOR_OPTIONS_FACTORY,
      useFactory: async (optionsFactory: IOptionsFactory) =>
        optionsFactory.createOptions(),
      inject: [optionsAsync.useExisting || optionsAsync.useClass],
    };
  }
}
