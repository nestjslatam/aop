import { defer, lastValueFrom, throwError } from 'rxjs';
import { AopRegistry, LogMethod, Retry } from '@nestjslatam/aop.nestjs';

import { FakeSink, registerAspects } from './aop-test.helper';

class TimeoutError extends Error {}

/** A driver that reports every failure through one class, told apart by a code. */
class DriverError extends Error {
  constructor(readonly number: number) {
    super(`driver error ${number}`);
  }
}

const esInterbloqueo = (error: any): boolean => error?.number === 1205;

class Flaky {
  calls = 0;

  @Retry({ maxAttempts: 3 })
  syncRecovers(): string {
    this.calls += 1;

    if (this.calls < 3) throw new Error('transient');

    return 'ok';
  }

  @Retry({ maxAttempts: 1 })
  syncExhausts(): string {
    this.calls += 1;

    throw new Error('always fails');
  }

  @Retry({ maxAttempts: 3, delayMs: 1 })
  async asyncRecovers(): Promise<string> {
    this.calls += 1;

    if (this.calls < 3) throw new Error('transient');

    return 'ok';
  }

  @Retry({ maxAttempts: 5, errorTypes: [TimeoutError] })
  onlyTimeouts(): string {
    this.calls += 1;

    throw new Error('not a timeout');
  }

  @Retry({ maxAttempts: 3, shouldRetry: esInterbloqueo })
  soloInterbloqueo(codigo: number): string {
    this.calls += 1;

    throw new DriverError(codigo);
  }

  @Retry({
    maxAttempts: 3,
    errorTypes: [DriverError],
    shouldRetry: esInterbloqueo,
  })
  ambosFiltros(codigo: number): string {
    this.calls += 1;

    throw new DriverError(codigo);
  }

  @Retry({ maxAttempts: 2, handleException: true })
  swallows(): string {
    this.calls += 1;

    throw new Error('still failing');
  }

  @Retry({ maxAttempts: 2 })
  stream() {
    return defer(() => {
      this.calls += 1;

      return this.calls < 3
        ? throwError(() => new Error('transient'))
        : Promise.resolve('ok');
    });
  }

  @LogMethod({ order: 1 })
  @Retry({ order: 2, maxAttempts: 2 })
  logged(): string {
    this.calls += 1;

    if (this.calls < 2) throw new Error('transient');

    return 'ok';
  }
}

describe('RetryAspect', () => {
  let sink: FakeSink;
  let flaky: Flaky;

  beforeEach(() => {
    sink = new FakeSink();
    registerAspects(sink);
    flaky = new Flaky();
  });

  afterEach(() => AopRegistry.reset());

  it('retries a synchronous method until it succeeds', () => {
    expect(flaky.syncRecovers()).toBe('ok');
    expect(flaky.calls).toBe(3);
  });

  it('propagates the error once the attempts are exhausted', () => {
    expect(() => flaky.syncExhausts()).toThrow('always fails');
    expect(flaky.calls).toBe(2);
  });

  it('retries a rejected promise applying the delay', async () => {
    await expect(flaky.asyncRecovers()).resolves.toBe('ok');
    expect(flaky.calls).toBe(3);
  });

  it('retries only the declared error types', () => {
    expect(() => flaky.onlyTimeouts()).toThrow('not a timeout');
    expect(flaky.calls).toBe(1);
  });

  it('retries when the predicate accepts the error', () => {
    expect(() => flaky.soloInterbloqueo(1205)).toThrow('driver error 1205');
    expect(flaky.calls).toBe(4);
  });

  it('does not retry when the predicate rejects the error', () => {
    expect(() => flaky.soloInterbloqueo(2627)).toThrow('driver error 2627');
    expect(flaky.calls).toBe(1);
  });

  it('requires both filters to pass when both are declared', () => {
    expect(() => flaky.ambosFiltros(2627)).toThrow('driver error 2627');
    expect(flaky.calls).toBe(1);
  });

  it('swallows the error when handleException is enabled', () => {
    expect(flaky.swallows()).toBeUndefined();
    expect(flaky.calls).toBe(3);
  });

  it('resubscribes a failing observable', async () => {
    await expect(lastValueFrom(flaky.stream())).resolves.toBe('ok');
    expect(flaky.calls).toBe(3);
  });

  it('logs the call once even when the method is retried', () => {
    expect(flaky.logged()).toBe('ok');
    expect(flaky.calls).toBe(2);
    expect(sink.phases()).toEqual(['entry', 'call', 'exit']);
  });
});
