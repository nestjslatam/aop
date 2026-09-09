import { DynamicModule, Module, Provider } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  AspectExecutor,
  AspectPointCut,
  IAspect,
  IPointCut,
} from '@nestjslatam/aop';
import {
  Advice,
  AdviceAspect,
  AopLoggerToken,
  IAopLogger,
  LoggerAspect,
  RetryAspect,
} from '@nestjslatam/aop.aspects';
import { ISerializer, NestLoggerSink } from '@nestjslatam/aop.aspects.logger';

import { AopAspectsBuilder, AopFactory } from './builders';
import {
  AOP_ASPECTS,
  AOP_EXECUTOR,
  AOP_LOGGER,
  AOP_OPTIONS,
  AOP_OPTIONS_FACTORY,
  AOP_POINT_CUT,
  AOP_SERIALIZER,
} from './constants';
import { AopInterceptor } from './interceptors';
import {
  IAopOptions,
  IAopOptionsAsync,
  IAopOptionsFactory,
} from './interfaces';
import { AopRegistry } from './registry';

/**
 * Equivalent of `ServiceCollectionExtension.AddAop()`, expressed as the dynamic
 * module NestJS already provides instead of a container extension method.
 */
@Module({})
export class AopModule {
  static forRoot(options: IAopOptions = {}): DynamicModule {
    const builder = new AopAspectsBuilder();

    options.configure?.(builder);

    return {
      module: AopModule,
      global: true,
      providers: [
        { provide: AOP_OPTIONS, useValue: options },
        ...AopModule.createProviders(builder),
      ],
      exports: AopModule.createExports(),
    };
  }

  static forRootAsync(optionsAsync: IAopOptionsAsync): DynamicModule {
    const builder = new AopAspectsBuilder();

    optionsAsync.configure?.(builder);

    return {
      module: AopModule,
      global: true,
      imports: [...(optionsAsync.imports ?? [])],
      providers: [
        ...AopModule.createAsyncProviders(optionsAsync),
        {
          provide: AOP_OPTIONS,
          useFactory: (options: IAopOptions) => options ?? {},
          inject: [AOP_OPTIONS_FACTORY],
        },
        ...AopModule.createProviders(builder),
        ...(optionsAsync.extraProviders ?? []),
      ],
      exports: AopModule.createExports(),
    };
  }

  private static createProviders(builder: AopAspectsBuilder): Provider[] {
    return [
      {
        provide: AOP_SERIALIZER,
        useFactory: (options: IAopOptions) =>
          AopFactory.createSerializer(options),
        inject: [AOP_OPTIONS],
      },
      {
        provide: AOP_LOGGER,
        useFactory: (serializer: ISerializer) => new NestLoggerSink(serializer),
        inject: [AOP_SERIALIZER],
      },
      {
        provide: LoggerAspect,
        useFactory: (moduleRef: ModuleRef, defaultLogger: IAopLogger) =>
          new LoggerAspect((token?: AopLoggerToken) =>
            token
              ? moduleRef.get<IAopLogger>(token as any, { strict: false })
              : defaultLogger,
          ),
        inject: [ModuleRef, AOP_LOGGER],
      },
      { provide: RetryAspect, useFactory: () => new RetryAspect() },
      {
        provide: AdviceAspect,
        useFactory: (moduleRef: ModuleRef) =>
          new AdviceAspect((token) =>
            moduleRef.get(token as any, { strict: false }),
          ),
        inject: [ModuleRef],
      },
      { provide: Advice, useFactory: () => new Advice() },
      ...builder.providers,
      { provide: AOP_POINT_CUT, useFactory: () => new AspectPointCut() },
      {
        provide: AOP_ASPECTS,
        useFactory: (...aspects: IAspect[]) => aspects,
        inject: [
          LoggerAspect,
          RetryAspect,
          AdviceAspect,
          ...builder.aspectTokens,
        ],
      },
      {
        provide: AOP_EXECUTOR,
        useFactory: (aspects: IAspect[], pointCut: IPointCut) => {
          const executor = new AspectExecutor(aspects, pointCut);

          AopRegistry.set(executor);

          return executor;
        },
        inject: [AOP_ASPECTS, AOP_POINT_CUT],
      },
      AopInterceptor,
    ];
  }

  private static createExports(): any[] {
    return [
      AOP_OPTIONS,
      AOP_SERIALIZER,
      AOP_LOGGER,
      AOP_ASPECTS,
      AOP_EXECUTOR,
      AopInterceptor,
    ];
  }

  private static createAsyncProviders(
    optionsAsync: IAopOptionsAsync,
  ): Provider[] {
    if (optionsAsync.useExisting || optionsAsync.useFactory) {
      return [AopModule.createAsyncOptionsProvider(optionsAsync)];
    }

    if (!optionsAsync.useClass) {
      throw new Error(
        'AopModule.forRootAsync requires one of useFactory, useClass or useExisting.',
      );
    }

    return [
      AopModule.createAsyncOptionsProvider(optionsAsync),
      { provide: optionsAsync.useClass, useClass: optionsAsync.useClass },
    ];
  }

  private static createAsyncOptionsProvider(
    optionsAsync: IAopOptionsAsync,
  ): Provider {
    if (optionsAsync.useFactory) {
      return {
        provide: AOP_OPTIONS_FACTORY,
        useFactory: optionsAsync.useFactory,
        inject: optionsAsync.inject ?? [],
      };
    }

    return {
      provide: AOP_OPTIONS_FACTORY,
      useFactory: async (optionsFactory: IAopOptionsFactory) =>
        optionsFactory.createOptions(),
      inject: [(optionsAsync.useExisting ?? optionsAsync.useClass) as any],
    };
  }
}
