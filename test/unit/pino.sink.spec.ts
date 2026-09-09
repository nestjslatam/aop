import { SensitiveDataJsonSerializer } from '@nestjslatam/aop.aspects.logger';
import { PinoSink } from '@nestjslatam/aop.aspects.logger.pino';
import {
  AopRegistry,
  LogMethod,
  LogSensitive,
  LogSensitiveParam,
} from '@nestjslatam/aop.nestjs';
import pino from 'pino';
import { Writable } from 'stream';

import { registerAspects } from './aop-test.helper';

class Customer {
  @LogSensitive()
  taxId = '12345678';

  constructor(public name: string) {}
}

const createSink = (): { sink: PinoSink; lines: any[] } => {
  const lines: any[] = [];

  const stream = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(JSON.parse(chunk.toString()));
      callback();
    },
  });

  const sink = new PinoSink(
    new SensitiveDataJsonSerializer(),
    pino({ level: 'debug' }, stream),
  );

  return { sink, lines };
};

describe('PinoSink', () => {
  afterEach(() => AopRegistry.reset());

  it('writes the structured fields of every phase', () => {
    const { sink, lines } = createSink();

    class Orders {
      @LogMethod()
      find(id: string): string {
        return `order ${id}`;
      }
    }

    registerAspects(sink);

    expect(new Orders().find('1')).toBe('order 1');
    expect(lines).toHaveLength(3);

    const [entry, call, exit] = lines;

    expect(entry.msg).toBe('Start Call.');
    expect(entry.level).toBe(20);
    expect(entry.className).toBe('Orders');
    expect(entry.methodName).toBe('find');
    expect(entry.arguments).toContain('order 1'.slice(6));
    expect(call.msg).toBe('End Call.');
    expect(call.returnType).toBe('String');
    expect(call.return).toBe('"order 1"');
    expect(exit.duration).toBeGreaterThanOrEqual(0);
  });

  it('logs the exception at error level keeping the stack', () => {
    const { sink, lines } = createSink();

    class Broken {
      @LogMethod()
      run(): string {
        throw new Error('boom');
      }
    }

    registerAspects(sink);

    expect(() => new Broken().run()).toThrow('boom');

    const failure = lines.find((line) => line.msg === 'Exception.');

    expect(failure.level).toBe(50);
    expect(failure.err.message).toBe('boom');
    expect(failure.err.stack).toBeDefined();
  });

  it('keeps masking sensitive parameters and properties', () => {
    const { sink, lines } = createSink();

    class Accounts {
      @LogMethod()
      open(customer: Customer, @LogSensitiveParam() secret: string): Customer {
        void secret;

        return customer;
      }
    }

    registerAspects(sink);

    new Accounts().open(new Customer('ada'), 's3cr3t');

    const entry = lines[0];

    expect(entry.arguments).toContain('ada');
    expect(entry.arguments).not.toContain('12345678');
    expect(entry.arguments).not.toContain('s3cr3t');
    expect(entry.arguments).toContain('**********');
  });

  it('falls back to a plain JSON serializer and a default pino logger', () => {
    expect(() => new PinoSink()).not.toThrow();
  });
});
