import { IJoinPoint, IMethodInfo } from '../interfaces';

export interface IJoinPointProps {
  args: any[];
  methodInfo: IMethodInfo;
  targetObject: any;
  targetType: string;
  invoke: (args: any[]) => any;
  trackingId?: string;
  requestId?: string;
}

/** TypeScript port of `BeyondNet.Aop.JoinPoint`. */
export class JoinPoint implements IJoinPoint {
  private readonly startedAt: number = Date.now();

  args: any[];
  returnValue: any;
  trackingId?: string;
  requestId?: string;
  traceId?: string;
  spanId?: string;

  readonly methodInfo: IMethodInfo;
  readonly targetObject: any;
  readonly targetType: string;

  private readonly invoke: (args: any[]) => any;

  constructor(props: IJoinPointProps) {
    this.args = props.args;
    this.methodInfo = props.methodInfo;
    this.targetObject = props.targetObject;
    this.targetType = props.targetType;
    this.trackingId = props.trackingId;
    this.requestId = props.requestId;
    this.invoke = props.invoke;
  }

  get elapsedMs(): number {
    return Date.now() - this.startedAt;
  }

  proceed(): any {
    return this.invoke(this.args);
  }
}
