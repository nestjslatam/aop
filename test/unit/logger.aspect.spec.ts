import { lastValueFrom, of, throwError } from 'rxjs';
import { LogMethod, LogSensitiveParam } from '@nestjslatam/aop.nestjs';
import { AopRegistry } from '@nestjslatam/aop.nestjs';

import { FakeSink, registerAspects } from './aop-test.helper';

class Sample {
  @LogMethod()
  greet(name: string): string {
    return `hello ${name}`;
  }

  @LogMethod()
  fail(): string {
    throw new Error('boom');
  }

  @LogMethod()
  async greetAsync(name: string): Promise<string> {
    return `hello ${name}`;
  }

  @LogMethod()
  greetStream(name: string) {
    return of(`hello ${name}`);
  }

  @LogMethod()
  failStream() {
    return throwError(() => new Error('stream boom'));
  }

  @LogMethod()
  login(user: string, @LogSensitiveParam() password: string): string {
    return `${user} logged in with ${password.length} chars`;
  }

  // Devuelve el fallo en vez de lanzarlo, como `Result`, `Either` o una tupla.
  @LogMethod({ isFailure: (valor) => valor?.ok === false })
  devuelveElFallo(): { ok: boolean } {
    return { ok: false };
  }

  @LogMethod({ isFailure: (valor) => valor?.ok === false })
  devuelveExito(): { ok: boolean } {
    return { ok: true };
  }

  @LogMethod({ name: 'cobrar-pedido' })
  named(): string {
    return 'ok';
  }

  @LogMethod({ logArguments: false, logReturn: false })
  quiet(): string {
    return 'quiet';
  }
}

describe('LoggerAspect', () => {
  let sink: FakeSink;
  let sample: Sample;

  beforeEach(() => {
    sink = new FakeSink();
    registerAspects(sink);
    sample = new Sample();
  });

  afterEach(() => AopRegistry.reset());

  it('logs entry, result and exit of a synchronous method', () => {
    expect(sample.greet('ada')).toBe('hello ada');
    expect(sink.phases()).toEqual(['entry', 'call', 'exit']);

    const entry = sink.entries[0];
    expect(entry.context.targetType).toBe('Sample');
    expect(entry.context.methodInfo).toBe('greet');
    expect(entry.parameters?.[0].value).toBe('ada');
    expect(sink.entries[1].result?.value).toBe('hello ada');
  });

  it('logs the exception once and rethrows it', () => {
    expect(() => sample.fail()).toThrow('boom');
    expect(sink.phases()).toEqual(['entry', 'exception', 'exit']);
  });

  it('waits for a promise before logging the result', async () => {
    const promise = sample.greetAsync('ada');

    expect(sink.phases()).toEqual(['entry']);
    await expect(promise).resolves.toBe('hello ada');
    expect(sink.phases()).toEqual(['entry', 'call', 'exit']);
  });

  it('waits for an observable before logging the result', async () => {
    await expect(lastValueFrom(sample.greetStream('ada'))).resolves.toBe(
      'hello ada',
    );

    expect(sink.phases()).toEqual(['entry', 'call', 'exit']);
  });

  it('logs an observable failure and keeps the error', async () => {
    await expect(lastValueFrom(sample.failStream())).rejects.toThrow(
      'stream boom',
    );

    expect(sink.phases()).toEqual(['entry', 'exception', 'exit']);
  });

  it('masks the parameters flagged as sensitive', () => {
    sample.login('ada', 's3cr3t');

    const parameters = sink.entries[0].parameters ?? [];

    expect(parameters[0].value).toBe('ada');
    expect(parameters[1].value).toBe('**********');
  });

  it('marks the call as failed when isFailure says so', () => {
    sample.devuelveElFallo();

    const llamada = sink.entries.find((entry) => entry.phase === 'call');
    expect(llamada?.context.failed).toBe(true);
  });

  it('leaves failed undefined when the value is not a failure', () => {
    sample.devuelveExito();

    const llamada = sink.entries.find((entry) => entry.phase === 'call');
    expect(llamada?.context.failed).toBeUndefined();
  });

  it('hands the business name to the sink', () => {
    sample.named();

    expect(
      sink.entries.every((entry) => entry.context.name === 'cobrar-pedido'),
    ).toBe(true);
  });

  it('leaves the name undefined when it is not declared', () => {
    sample.quiet();

    expect(sink.entries[0].context.name).toBeUndefined();
  });

  // Las dos opciones suprimen el DATO, no la fase, igual que `logArguments: false` deja pasar
  // `onEntry` sin parametros. Saltarse `onCall` dejaba sin narrar la llamada completada.
  it('honours logArguments and logReturn without dropping a phase', () => {
    sample.quiet();

    expect(sink.entries[0].parameters).toBeUndefined();
    expect(sink.phases()).toEqual(['entry', 'call', 'exit']);
    expect(sink.entries[1].result?.value).toBeUndefined();
  });
});
