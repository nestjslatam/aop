import { IJoinPoint } from './join-point.interface';

/** Continuation of the aspect chain. Replaces `SetNext`/`GetNext` of the .NET version. */
export type AspectNext = () => any;

export interface IAspectOptions {
  /** Lower values run first. Defaults to `Number.MAX_SAFE_INTEGER`. */
  order?: number;
  /**
   * When `true` the decorator only writes metadata and `AopInterceptor` runs the
   * aspect. Only works on controller/resolver handlers.
   */
  useInterceptor?: boolean;
}

/**
 * Per invocation state. Aspects are singletons in the NestJS container, so any
 * mutable state must live here and never on the aspect instance.
 */
export interface IAspectContext<
  TOptions extends IAspectOptions = IAspectOptions,
> {
  options: TOptions;
  handleException: boolean;
  state: Record<string, any>;
}

export interface IAspect {
  /** Metadata token that binds this aspect to the decorator that declares it. */
  readonly token: string;
  getOrder(joinPoint: IJoinPoint): number;
  apply(joinPoint: IJoinPoint, next: AspectNext): any;
}
