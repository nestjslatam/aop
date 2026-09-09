import { IJoinPoint } from '@nestjslatam/aop';
import { IAdvice } from '@nestjslatam/aop.aspects';
import { AopRegistry, UseAdvice } from '@nestjslatam/aop.nestjs';

import { FakeSink, registerAspects } from './aop-test.helper';

class AuditAdvice implements IAdvice {
  readonly calls: string[] = [];

  onEntry(joinPoint: IJoinPoint, context?: any[]): void {
    this.calls.push(`entry:${joinPoint.methodInfo.name}:${context?.[0]}`);
  }

  onSuccess(): void {
    this.calls.push('success');
  }

  onExit(): void {
    this.calls.push('exit');
  }

  onException(
    joinPoint: IJoinPoint,
    context: any[] | undefined,
    error: any,
  ): void {
    this.calls.push(`exception:${error.message}`);
  }
}

class Service {
  @UseAdvice({ advice: AuditAdvice, context: ['orders'] })
  save(id: string): string {
    return `saved ${id}`;
  }

  @UseAdvice({ advice: AuditAdvice, handleException: true })
  broken(): string {
    throw new Error('nope');
  }

  @UseAdvice({ advice: 'MissingAdvice' as any })
  unresolved(): string {
    return 'never';
  }
}

describe('AdviceAspect', () => {
  let advice: AuditAdvice;
  let service: Service;

  beforeEach(() => {
    advice = new AuditAdvice();
    registerAspects(new FakeSink(), { AuditAdvice: advice });
    service = new Service();
  });

  afterEach(() => AopRegistry.reset());

  it('runs the advice around the method', () => {
    expect(service.save('1')).toBe('saved 1');
    expect(advice.calls).toEqual(['entry:save:orders', 'success', 'exit']);
  });

  it('swallows the error when handleException is enabled', () => {
    expect(service.broken()).toBeUndefined();
    expect(advice.calls).toEqual([
      'entry:broken:undefined',
      'exception:nope',
      'exit',
    ]);
  });

  it('fails with a helpful message when the advice is not registered', () => {
    expect(() => service.unresolved()).toThrow(/no advice registered/i);
  });
});
