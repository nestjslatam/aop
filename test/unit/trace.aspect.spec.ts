import { context, SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';
import { AsyncHooksContextManager } from '@opentelemetry/context-async-hooks';
import {
  BasicTracerProvider,
  InMemorySpanExporter,
  ReadableSpan,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { TraceAspect, Trace } from '@nestjslatam/aop.aspects.telemetry';
import { AopRegistry, LogMethod, Retry } from '@nestjslatam/aop.nestjs';

import { FakeSink, registerAspects } from './aop-test.helper';

const exporter = new InMemorySpanExporter();
const contextManager = new AsyncHooksContextManager();

class Orders {
  calls = 0;
  activeSpanId?: string;

  @Trace({ resolveAttributes: (args) => ({ 'order.id': args[0] }) })
  find(id: string): string {
    this.activeSpanId = trace.getActiveSpan()?.spanContext().spanId;

    return `order ${id}`;
  }

  @Trace()
  async findAsync(id: string): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 5));

    return `order ${id}`;
  }

  @Trace({ kind: SpanKind.SERVER })
  broken(): string {
    throw new Error('boom');
  }

  @Trace()
  @Retry({ maxAttempts: 2 })
  flaky(): string {
    this.calls += 1;

    if (this.calls < 2) throw new Error('transient');

    return 'ok';
  }

  @Trace()
  @LogMethod()
  logged(): string {
    return 'logged';
  }
}

describe('TraceAspect', () => {
  let sink: FakeSink;
  let orders: Orders;

  beforeAll(() => {
    trace.setGlobalTracerProvider(
      new BasicTracerProvider({
        spanProcessors: [new SimpleSpanProcessor(exporter)],
      }),
    );
    context.setGlobalContextManager(contextManager.enable());
  });

  afterAll(() => {
    contextManager.disable();
    context.disable();
    trace.disable();
  });

  beforeEach(() => {
    exporter.reset();
    sink = new FakeSink();
    registerAspects(sink, {}, [new TraceAspect()]);
    orders = new Orders();
  });

  afterEach(() => AopRegistry.reset());

  const spans = (): ReadableSpan[] => exporter.getFinishedSpans();

  it('opens one span per call with the semantic attributes', () => {
    expect(orders.find('1')).toBe('order 1');
    expect(spans()).toHaveLength(1);

    const [span] = spans();

    expect(span.name).toBe('Orders.find');
    expect(span.attributes['code.function']).toBe('find');
    expect(span.attributes['code.namespace']).toBe('Orders');
    expect(span.attributes['order.id']).toBe('1');
    expect(span.status.code).toBe(SpanStatusCode.OK);
  });

  it('makes the span active while the method runs', () => {
    orders.find('1');

    expect(orders.activeSpanId).toBe(spans()[0].spanContext().spanId);
  });

  it('closes the span only when the promise settles', async () => {
    const promise = orders.findAsync('1');

    expect(spans()).toHaveLength(0);

    await expect(promise).resolves.toBe('order 1');
    expect(spans()).toHaveLength(1);
  });

  it('records the exception and rethrows it', () => {
    expect(() => orders.broken()).toThrow('boom');

    const [span] = spans();

    expect(span.kind).toBe(SpanKind.SERVER);
    expect(span.status.code).toBe(SpanStatusCode.ERROR);
    expect(span.status.message).toBe('boom');
    expect(span.events[0].name).toBe('exception');
  });

  it('keeps every retry inside a single span', () => {
    expect(orders.flaky()).toBe('ok');

    expect(orders.calls).toBe(2);
    expect(spans()).toHaveLength(1);
  });

  it('hands the trace ids to the logging aspect', () => {
    expect(orders.logged()).toBe('logged');

    const [span] = spans();

    expect(sink.entries[0].context.traceId).toBe(span.spanContext().traceId);
    expect(sink.entries[0].context.spanId).toBe(span.spanContext().spanId);
  });
});
