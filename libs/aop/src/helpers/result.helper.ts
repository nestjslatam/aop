import { from, isObservable, Observable, of } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';

export interface IResultHooks {
  onSuccess?: (value: any) => void;
  /** Return a value to recover from the error, or throw to propagate it. */
  onError?: (error: any) => any;
  onFinally?: () => void;
}

export const isPromise = (value: any): value is Promise<any> =>
  !!value && typeof value.then === 'function';

export const isAsync = (value: any): boolean =>
  isPromise(value) || isObservable(value);

export const delayFor = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const toObservable = (value: any): Observable<any> => {
  if (isObservable(value)) return value;
  if (isPromise(value)) return from(value);
  return of(value);
};

/**
 * Runs the boundary hooks over a synchronous value, a Promise or an Observable
 * without changing the shape of the returned value. This is what lets a single
 * aspect chain support sync, async and reactive methods (decision D3).
 */
export class ResultHelper {
  static handle(value: any, hooks: IResultHooks): any {
    if (isPromise(value)) return ResultHelper.handlePromise(value, hooks);
    if (isObservable(value)) return ResultHelper.handleObservable(value, hooks);

    hooks.onSuccess?.(value);
    hooks.onFinally?.();

    return value;
  }

  private static handlePromise(
    value: Promise<any>,
    hooks: IResultHooks,
  ): Promise<any> {
    let promise = value.then((resolved) => {
      hooks.onSuccess?.(resolved);
      return resolved;
    });

    if (hooks.onError) {
      const onError = hooks.onError;
      promise = promise.catch((error) => onError(error));
    }

    return hooks.onFinally ? promise.finally(hooks.onFinally) : promise;
  }

  private static handleObservable(
    value: Observable<any>,
    hooks: IResultHooks,
  ): Observable<any> {
    let observable = hooks.onSuccess
      ? value.pipe(tap({ next: hooks.onSuccess }))
      : value;

    if (hooks.onError) {
      const onError = hooks.onError;
      observable = observable.pipe(
        catchError((error) => toObservable(onError(error))),
      );
    }

    return hooks.onFinally
      ? observable.pipe(finalize(hooks.onFinally))
      : observable;
  }
}
