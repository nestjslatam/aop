import { Controller, Get, Injectable } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AOP_EXECUTOR,
  AOP_LOGGER,
  AopModule,
  AopRegistry,
  LogMethod,
  Retry,
} from '@nestjslatam/aop.nestjs';
import { LogReflectorModule } from '@nestjslatam/logreflector-lib';

import { FakeSink } from './aop-test.helper';

@Injectable()
class OrdersService {
  calls = 0;

  @LogMethod({ requestId: 'req-1' })
  find(id: string): string {
    return `order ${id}`;
  }

  @LogMethod({ order: 1 })
  @Retry({ order: 2, maxAttempts: 2 })
  flaky(): string {
    this.calls += 1;

    if (this.calls < 2) throw new Error('transient');

    return 'ok';
  }
}

@Controller('orders')
class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  @LogMethod()
  list(): string {
    return this.orders.find('1');
  }
}

class Detached {
  @LogMethod()
  run(): string {
    return 'untouched';
  }
}

describe('AopModule', () => {
  let moduleRef: TestingModule;
  let sink: FakeSink;

  beforeEach(async () => {
    sink = new FakeSink();

    moduleRef = await Test.createTestingModule({
      imports: [AopModule.forRoot({ configuration: { serializer: 'json' } })],
      controllers: [OrdersController],
      providers: [OrdersService],
    })
      .overrideProvider(AOP_LOGGER)
      .useValue(sink)
      .compile();

    await moduleRef.init();
  });

  afterEach(async () => {
    await moduleRef.close();
    AopRegistry.reset();
  });

  // `addLogger` registraba el sink sin hacerlo el predeterminado, asi que un `@LogMethod()` sin
  // `logger` seguia escribiendo con `NestLoggerSink` y las entradas salian con otra forma.
  it('makes the registered sink the default one', async () => {
    const propio = new FakeSink();

    class SinkPropio extends FakeSink {}

    const conSink = await Test.createTestingModule({
      imports: [
        AopModule.forRoot({ configure: (b) => b.addLogger(SinkPropio) }),
      ],
      providers: [OrdersService],
    })
      .overrideProvider(SinkPropio)
      .useValue(propio)
      .compile();

    await conSink.init();
    conSink.get(OrdersService).find('7');

    expect(propio.entries.length).toBeGreaterThan(0);

    await conSink.close();
  });

  it('exposes the executor through the container', () => {
    expect(moduleRef.get(AOP_EXECUTOR)).toBeDefined();
  });

  it('injects the executor into a provider without the static registry', () => {
    AopRegistry.reset();

    expect(moduleRef.get(OrdersService).find('1')).toBe('order 1');
    expect(sink.phases()).toEqual(['entry', 'call', 'exit']);
    expect(sink.entries[0].context.requestId).toBe('req-1');
  });

  it('intercepts a controller handler the same way', () => {
    AopRegistry.reset();

    expect(moduleRef.get(OrdersController).list()).toBe('order 1');
    expect(sink.entries.map((entry) => entry.context.targetType)).toEqual([
      'OrdersController',
      'OrdersService',
      'OrdersService',
      'OrdersService',
      'OrdersController',
      'OrdersController',
    ]);
  });

  it('combines logging and retry on the same method', () => {
    AopRegistry.reset();

    expect(moduleRef.get(OrdersService).flaky()).toBe('ok');
    expect(sink.phases()).toEqual(['entry', 'call', 'exit']);
  });

  it('runs the original method when no executor is available', () => {
    AopRegistry.reset();

    expect(new Detached().run()).toBe('untouched');
    expect(sink.entries).toHaveLength(0);
  });
});

describe('LogReflectorModule (v1 facade)', () => {
  it('keeps registering the aspects underneath', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        LogReflectorModule.forRoot({
          behavior: { useProduction: false },
          configuration: { serializer: 'json', extension: 'default' },
        }),
      ],
      providers: [OrdersService],
    }).compile();

    await moduleRef.init();

    expect(moduleRef.get(AOP_EXECUTOR)).toBeDefined();
    expect(moduleRef.get(OrdersService).find('7')).toBe('order 7');

    await moduleRef.close();
    AopRegistry.reset();
  });
});
