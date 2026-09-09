import { Injectable } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AspectNext,
  IJoinPoint,
  OnMethodBoundaryAspect,
} from '@nestjslatam/aop';
import {
  IAdvice,
  IAopLogger,
  ILogContext,
  Parameter,
  Result,
} from '@nestjslatam/aop.aspects';
import {
  JsonSerializer,
  SensitiveDataJsonSerializer,
} from '@nestjslatam/aop.aspects.logger';
import {
  AOP_ASPECTS,
  AOP_LOGGER,
  AOP_OPTIONS,
  AOP_SERIALIZER,
  AopAspectsBuilder,
  AopFactory,
  AopModule,
  AopRegistry,
  applyAspect,
  IAopOptions,
  IAopOptionsFactory,
  LogMethod,
  UseAdvice,
} from '@nestjslatam/aop.nestjs';

const AUDIT_ASPECT_TOKEN = 'aop:aspect:audit';

const Audit = (order = 1) => applyAspect(AUDIT_ASPECT_TOKEN, { order });

@Injectable()
class AuditAspect extends OnMethodBoundaryAspect {
  readonly token = AUDIT_ASPECT_TOKEN;
  static readonly seen: string[] = [];

  protected onEntry(joinPoint: IJoinPoint): void {
    AuditAspect.seen.push(`entry:${joinPoint.methodInfo.name}`);
  }

  protected onExit(joinPoint: IJoinPoint): void {
    AuditAspect.seen.push(`exit:${joinPoint.methodInfo.name}`);
  }

  apply(joinPoint: IJoinPoint, next: AspectNext): any {
    return super.apply(joinPoint, next);
  }
}

@Injectable()
class TrailAdvice implements IAdvice {
  static readonly seen: string[] = [];

  onEntry(joinPoint: IJoinPoint): void {
    TrailAdvice.seen.push(`entry:${joinPoint.methodInfo.name}`);
  }

  onSuccess(): void {
    TrailAdvice.seen.push('success');
  }

  onExit(): void {
    TrailAdvice.seen.push('exit');
  }

  onException(): void {
    TrailAdvice.seen.push('exception');
  }
}

@Injectable()
class CustomSink implements IAopLogger {
  static readonly seen: string[] = [];

  onEntry(context: ILogContext, parameters?: Parameter[]): void {
    CustomSink.seen.push(
      `entry:${context.methodInfo}:${parameters?.length ?? 0}`,
    );
  }

  onCall(context: ILogContext, result: Result): void {
    CustomSink.seen.push(`call:${result.value}`);
  }

  onExit(): void {
    CustomSink.seen.push('exit');
  }

  onException(): void {
    CustomSink.seen.push('exception');
  }
}

@Injectable()
class Catalog {
  @Audit()
  list(): string {
    return 'listed';
  }

  @UseAdvice({ advice: TrailAdvice })
  save(id: string): string {
    return `saved ${id}`;
  }

  @LogMethod({ logger: CustomSink })
  report(name: string): string {
    return `report ${name}`;
  }
}

class OptionsFactory implements IAopOptionsFactory {
  createOptions(): IAopOptions {
    return { configuration: { serializer: 'sensitive' } };
  }
}

describe('AopAspectsBuilder', () => {
  it('registers a provider only once', () => {
    const builder = new AopAspectsBuilder();

    builder
      .addAspect(AuditAspect)
      .addAspect(AuditAspect)
      .addAdvice(TrailAdvice);

    expect(builder.providers).toEqual([AuditAspect, TrailAdvice]);
    expect(builder.aspectTokens).toEqual([AuditAspect, AuditAspect]);
  });

  describe('wired through AopModule.forRoot', () => {
    let catalog: Catalog;
    let moduleRef: TestingModule;

    beforeEach(async () => {
      AuditAspect.seen.length = 0;
      TrailAdvice.seen.length = 0;
      CustomSink.seen.length = 0;

      moduleRef = await Test.createTestingModule({
        imports: [
          AopModule.forRoot({
            configure: (builder) =>
              builder
                .addAspect(AuditAspect)
                .addAdvice(TrailAdvice)
                .addLogger(CustomSink),
          }),
        ],
        providers: [Catalog],
      }).compile();

      await moduleRef.init();
      catalog = moduleRef.get(Catalog);
    });

    afterEach(async () => {
      await moduleRef.close();
      AopRegistry.reset();
    });

    it('adds the custom aspect to the chain', () => {
      expect(moduleRef.get(AOP_ASPECTS)).toHaveLength(4);
      expect(catalog.list()).toBe('listed');
      expect(AuditAspect.seen).toEqual(['entry:list', 'exit:list']);
    });

    it('resolves a registered advice through the container', () => {
      expect(catalog.save('1')).toBe('saved 1');
      expect(TrailAdvice.seen).toEqual(['entry:save', 'success', 'exit']);
    });

    it('logs through the sink named in the decorator', () => {
      expect(catalog.report('sales')).toBe('report sales');
      expect(CustomSink.seen).toEqual([
        'entry:report:1',
        'call:report sales',
        'exit',
      ]);
    });
  });
});

describe('AopModule.forRootAsync', () => {
  it('builds the options from a factory class', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AopModule.forRootAsync({ useClass: OptionsFactory })],
    }).compile();

    await moduleRef.init();

    expect(
      moduleRef.get<IAopOptions>(AOP_OPTIONS).configuration?.serializer,
    ).toBe('sensitive');
    expect(moduleRef.get(AOP_SERIALIZER)).toBeInstanceOf(
      SensitiveDataJsonSerializer,
    );
    expect(moduleRef.get(AOP_LOGGER)).toBeDefined();

    await moduleRef.close();
    AopRegistry.reset();
  });

  it('rejects a configuration without a source of options', () => {
    expect(() => AopModule.forRootAsync({})).toThrow(
      /useFactory, useClass or useExisting/,
    );
  });
});

describe('AopFactory', () => {
  it('defaults to the plain JSON serializer', () => {
    expect(AopFactory.createSerializer()).toBeInstanceOf(JsonSerializer);
    expect(AopFactory.createSerializer({})).toBeInstanceOf(JsonSerializer);
  });

  it('builds the masking serializer when requested', () => {
    expect(
      AopFactory.createSerializer({
        configuration: { serializer: 'sensitive' },
      }),
    ).toBeInstanceOf(SensitiveDataJsonSerializer);
  });
});
