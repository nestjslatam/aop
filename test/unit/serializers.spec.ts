import {
  JsonSerializer,
  SensitiveDataJsonSerializer,
} from '@nestjslatam/aop.aspects.logger';
import { LogSensitive } from '@nestjslatam/aop.nestjs';

class Customer {
  @LogSensitive()
  taxId: string;

  @LogSensitive()
  password = 'p4ssw0rd';

  constructor(public name: string, taxId: string) {
    this.taxId = taxId;
  }
}

describe('serializers', () => {
  it('serializes plain values', () => {
    expect(new JsonSerializer().serialize({ a: 1 })).toBe('{"a":1}');
  });

  it('never throws on a circular structure', () => {
    const circular: any = { name: 'root' };
    circular.self = circular;

    expect(new JsonSerializer().serialize(circular)).toBe('[Unserializable]');
  });

  it('masks the properties flagged as sensitive', () => {
    const serialized = new SensitiveDataJsonSerializer().serialize(
      new Customer('ada', '12345678'),
    );

    expect(serialized).toContain('"name":"ada"');
    expect(serialized).not.toContain('12345678');
    expect(serialized).not.toContain('p4ssw0rd');
    expect(serialized).toContain('**********');
  });

  it('leaves plain objects untouched', () => {
    expect(new SensitiveDataJsonSerializer().serialize({ password: 'x' })).toBe(
      '{"password":"x"}',
    );
  });
});
