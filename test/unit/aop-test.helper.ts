import { AspectExecutor, AspectPointCut, IAspect } from '@nestjslatam/aop';
import {
  AdviceAspect,
  IAdvice,
  IAopLogger,
  ILogContext,
  LoggerAspect,
  Parameter,
  Result,
  RetryAspect,
} from '@nestjslatam/aop.aspects';
import { AopRegistry } from '@nestjslatam/aop.nestjs';

export interface ILogEntry {
  phase: 'entry' | 'call' | 'exit' | 'exception';
  context: ILogContext;
  parameters?: Parameter[];
  result?: Result;
  error?: Error;
}

export class FakeSink implements IAopLogger {
  readonly entries: ILogEntry[] = [];

  onEntry(context: ILogContext, parameters?: Parameter[]): void {
    this.entries.push({ phase: 'entry', context, parameters });
  }

  onCall(context: ILogContext, result: Result): void {
    this.entries.push({ phase: 'call', context, result });
  }

  onExit(context: ILogContext): void {
    this.entries.push({ phase: 'exit', context });
  }

  onException(context: ILogContext, error: Error): void {
    this.entries.push({ phase: 'exception', context, error });
  }

  phases(): string[] {
    return this.entries.map((entry) => entry.phase);
  }
}

/** Wires the aspect chain the way `AopModule` does, without the container. */
export const registerAspects = (
  sink: IAopLogger,
  advices: Record<string, IAdvice> = {},
  extra: IAspect[] = [],
): AspectExecutor => {
  const aspects: IAspect[] = [
    new LoggerAspect(() => sink),
    new RetryAspect(),
    new AdviceAspect((token: any) => advices[String(token?.name ?? token)]),
    ...extra,
  ];

  const executor = new AspectExecutor(aspects, new AspectPointCut());

  AopRegistry.set(executor);

  return executor;
};
