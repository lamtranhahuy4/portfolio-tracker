/**
 * Memoization utilities for pure selectors and expensive computations.
 *
 * These are infrastructure-only helpers.  They are NOT wired into
 * `usePortfolioMetrics` yet — that belongs to a later refactoring step.
 *
 * Usage patterns supported:
 *  - `createMemoizedSelector` — reference-equality cache with pluggable equality fn
 *  - `createMultiArgMemoizedSelector` — caches based on a tuple of arguments
 *  - `memoizeOne` — caches only the most recent call (like `memoize-one` npm pkg)
 */

/**
 * Creates a selector that caches its last result. Re-computes only when
 * the input `state` reference changes AND the new result fails the
 * `equalityFn` check (defaults to `Object.is`).
 *
 * This is suitable for replacing bare `useMemo` calls where you need the
 * cache to survive re-renders with the same state reference.
 *
 * @example
 * const selectMetrics = createMemoizedSelector(
 *   (state: PortfolioState) => calculatePortfolioMetrics(state.transactions, ...),
 *   shallowEqual
 * );
 */
export function createMemoizedSelector<TState, TResult>(
  selector: (state: TState) => TResult,
  equalityFn: (a: TResult, b: TResult) => boolean = Object.is
): (state: TState) => TResult {
  let cachedResult: TResult;
  let prevState: TState | undefined;
  let initialized = false;

  return (state: TState): TResult => {
    if (prevState === state && initialized) {
      return cachedResult;
    }

    const nextResult = selector(state);

    if (!initialized || !equalityFn(nextResult, cachedResult)) {
      cachedResult = nextResult;
    }

    prevState = state;
    initialized = true;
    return cachedResult;
  };
}

/**
 * Caches only the most recent call result, comparing each argument with
 * `Object.is`. Equivalent to the popular `memoize-one` library, but with
 * full TypeScript generics support and zero dependencies.
 *
 * @example
 * const expensiveFn = memoizeOne((a: number, b: number) => a + b);
 * expensiveFn(1, 2); // computes
 * expensiveFn(1, 2); // returns cached
 * expensiveFn(1, 3); // computes again
 */
export function memoizeOne<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  equalityFn: (a: TArgs, b: TArgs) => boolean = argsShallowEqual
): (...args: TArgs) => TReturn {
  let cachedArgs: TArgs | undefined;
  let cachedResult: TReturn;
  let initialized = false;

  return (...args: TArgs): TReturn => {
    if (initialized && cachedArgs !== undefined && equalityFn(args, cachedArgs)) {
      return cachedResult;
    }
    cachedResult = fn(...args);
    cachedArgs = args;
    initialized = true;
    return cachedResult;
  };
}

/**
 * Performs a shallow argument-list comparison: all args at each index must
 * pass `Object.is`.  Used as the default equality for `memoizeOne`.
 */
function argsShallowEqual<TArgs extends unknown[]>(a: TArgs, b: TArgs): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!Object.is(a[i], b[i])) return false;
  }
  return true;
}

/**
 * Shallow-equality check for plain objects and arrays.
 * Useful as the `equalityFn` argument of `createMemoizedSelector` when
 * the selector returns a new object/array reference on every call.
 *
 * @example
 * const selectMetrics = createMemoizedSelector(selector, shallowEqual);
 */
export function shallowEqual<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (a === null || b === null) return false;

  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (
      !Object.prototype.hasOwnProperty.call(b, key) ||
      !Object.is((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
    ) {
      return false;
    }
  }

  return true;
}
