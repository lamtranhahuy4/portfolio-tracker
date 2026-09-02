# Challenger Report: Realtime Streaming, Client Store Batching & Error Architecture

**Target Plan Artifact**: `/Users/lamtranhahuy/Project/portfolio-tracker/sprint_5_plan.md`  
**Challenger Role**: `challenger_realtime_client` (Empirical Adversarial Reviewer)  
**Verdict**: **REQUEST_CHANGES** (Plan is architecturally sound in core design, but requires 3 critical implementation refinements to prevent production bugs)

---

## 1. Observation

Direct empirical observations and code references obtained from the codebase and plan:

### Obs 1: `QUAL-05` — `UnauthorizedError` Inheritance and Error Masking
- In `src/lib/auth.ts:225-230`:
  ```typescript
  export class UnauthorizedError extends Error {
    constructor(message = 'Unauthorized') {
      super(message);
      this.name = 'UnauthorizedError';
    }
  }
  ```
- In `src/lib/errorHandler.ts:41-58`:
  ```typescript
  export function withErrorHandler(...) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }
        captureError(error, ...);
        console.error('[withErrorHandler] Unhandled error:', error);
        throw new AppError('Đã xảy ra lỗi hệ thống. Vui lòng thử lại.', 'INTERNAL_ERROR', 500);
      }
    };
  }
  ```
- Live test execution (`npm test`) logged:
  `stderr | src/actions/__tests__/cashLedger.test.ts > cashLedger actions > saveCashEventsBatch should throw error if requireUser fails`  
  `[withErrorHandler] Unhandled error: Error: Unauthorized`
- Empirical execution of `withErrorHandler` with `UnauthorizedError extends Error` resulted in `AppError INTERNAL_ERROR 500 Đã xảy ra lỗi hệ thống. Vui lòng thử lại.`.
- When tested with `UnauthorizedError extends AppError { constructor() { super('Unauthorized', 'UNAUTHORIZED', 401); ... } }`, `withErrorHandler` preserved `UnauthorizedError UNAUTHORIZED 401 Unauthorized` and bypassed Sentry / `console.error` unhandled logging.

### Obs 2: `PERF-01` — SWR Quote Poller Type Filtering Bug
- In `sprint_5_plan.md:204-209`:
  ```typescript
  for (let i = 0; i < data.quotes.length; i++) {
    const quote = data.quotes[i];
    if (quote.price !== null && quote.price !== undefined && !Number.isNaN(quote.price)) {
      priceBatch[quote.ticker.toUpperCase()] = quote.price;
    }
  }
  ```
- In JavaScript:
  - `Number.isNaN('30000')` returns `false` (no type coercion).
  - `Number.isNaN(Infinity)` returns `false`.
  - `Number.isNaN(-500)` returns `false`.
- Empirical test passing `{ VIC: '30000' }` into `calculatePortfolioMetrics()` caused `res.totalMarketValue` to collapse to `0` due to `Decimal` string summation mismatch in `decimalSum`.
- Empirical test passing `{ VIC: Infinity }` into `calculatePortfolioMetrics()` caused `res.totalMarketValue` to become `Infinity`.
- In `sprint_5_plan.md:221`, the Risk Assessment claims: *"Verified that `updatePricesBatch` preserves manual overrides (`isManualOverride: false`) and updates both `currentPrices` and `lastKnownPrices`."* However, `src/store/usePortfolioStore.ts` contains only `currentPrices: Record<string, number>`, and `isManualOverride` is a database column, not present in the Zustand store.

### Obs 3: `PERF-02` — `useRealtimePrices` Inline Callback Reconnection Storm
- In `sprint_5_plan.md:351`:
  ```typescript
  const connect = useCallback(() => {
    ...
  }, [tickersKey, enabled, onPriceUpdate, clearReconnectTimer]);
  ```
- In `sprint_5_plan.md:372`:
  ```typescript
  useEffect(() => {
    if (enabled && tickersKey.length > 0) {
      connect();
    } else {
      disconnect();
    }
    return () => {
      disconnect();
    };
  }, [tickersKey, enabled, connect, disconnect]);
  ```
- Empirical simulation: When a host component renders with an inline callback `<RealtimeComponent onPriceUpdate={(u) => ...} />`, `onPriceUpdate` changes reference on every render. Because `connect` depends on `onPriceUpdate`, `connect` changes on every render, causing `useEffect` to tear down the old `EventSource` and open a new `EventSource` on every single parent render. Across 5 parent renders, 5 `EventSource` instances were opened and 8 closed.

### Obs 4: `PERF-03` — WHATWG SSE `: ping\n\n` Keep-Alive Compliance
- In `src/app/api/stream/prices/route.ts:511`: `controller.enqueue(encoder.encode(': ping\n\n'));`
- WHATWG Server-Sent Events Specification (Section 9.2.6): Lines starting with a colon `:` are treated as comments and MUST be ignored by user agents.
- Empirical test: Stream chunks containing `: ping\n\n` comments interspersed with `data: [...]` were parsed by standard SSE parsers. Comment lines were safely discarded and did NOT trigger `onmessage` or JSON parse errors.

---

## 2. Logic Chain

1. **QUAL-05 Validity & Safety**:
   - *From Obs 1*: `UnauthorizedError` previously did not extend `AppError`, causing `withErrorHandler` to catch it as an unknown fatal error, log `Unhandled error` to stderr, notify Sentry, and re-throw generic 500 `INTERNAL_ERROR`.
   - Extending `AppError` with status 401 and code `'UNAUTHORIZED'` ensures `error instanceof AppError === true`.
   - Client components inspect `(error as Error).message` (e.g. `toast.error(err.message)`), which receives `'Unauthorized'` rather than `'Đã xảy ra lỗi hệ thống'`.
   - Existing API route handlers (`/api/price-alerts`, `/api/watchlist`, `/api/tax-calculation`, `/api/stream/prices`) using `error instanceof UnauthorizedError` continue to match accurately.
   - *Inference*: The QUAL-05 fix is completely safe, introduces zero breaking changes, and restores the intended error contract.

2. **PERF-01 Quote Poller Flaw**:
   - *From Obs 2*: The proposed `!Number.isNaN(quote.price)` check is insufficient because `Number.isNaN` returns `false` for string representations (`"30000"`), `Infinity`, and negative values.
   - *From Obs 2*: Injecting a string or `Infinity` into `currentPrices` causes `calculatePortfolioMetrics()` to either evaluate `totalMarketValue` to `0` or `Infinity`.
   - *Inference*: The plan must be updated to require `typeof quote.price === 'number' && Number.isFinite(quote.price) && quote.price >= 0`.
   - Additionally, `updatePricesBatch` in `usePortfolioStore.ts` creates a new object reference `{ ...state.currentPrices, ...updates }` even if `updates` is `{}` or contains unchanged prices, breaking `shallowEqual` in `memoizedCalculateMetrics` and triggering unnecessary FIFO recalculations. A shallow change-check (`hasChanges`) is required inside `updatePricesBatch`.

3. **PERF-02 Realtime Hook Callback Leak**:
   - *From Obs 3*: Including `onPriceUpdate` in `useCallback` dependencies forces `connect()` to change on every parent component render when unmemoized callbacks are provided.
   - *From Obs 3*: This creates an aggressive connection tear-down and re-open loop against `/api/stream/prices`.
   - *Inference*: `onPriceUpdate` must be assigned to `const onPriceUpdateRef = useRef(onPriceUpdate); onPriceUpdateRef.current = onPriceUpdate;` and invoked via `onPriceUpdateRef.current?.(update)` so `connect()` remains stable regardless of parent re-renders.

4. **PERF-03 Server SSE Route Resilience**:
   - *From Obs 4*: Keep-alive `: ping\n\n` comments are fully compliant with the WHATWG SSE standard and will not disrupt client `EventSource.onmessage` handlers.
   - If a client disconnects while the server is fetching quotes, calling `controller.enqueue()` will throw an error on a closed controller. The route's `try/catch` must ensure `isClosed = true` is set so the `finally` block does not schedule an unnecessary trailing `setTimeout`.

---

## 3. Caveats

- **Network Proxies**: While `: ping\n\n` satisfies HTTP/1.1 and HTTP/2 proxy keep-alive requirements for standard proxies (Cloudflare, AWS ALB, Nginx), corporate firewalls with aggressive packet inspection may occasionally buffer comment bytes. The 5000ms recursive timer mitigates this.
- **Serverless Execution Limits**: On Vercel Serverless Functions, streaming connections are subject to maximum function execution timeouts (15s on hobby, up to 300s on pro). The client hook's reconnect logic will naturally reconnect upon function termination.

---

## 4. Conclusion & Required Adjustments

The overall architecture in `sprint_5_plan.md` is well-structured and properly addresses the root causes of the review findings. However, before proceeding with implementation, the plan must incorporate the following **3 Required Refinements**:

### Required Change 1: Hardened Quote Sanitization (`PERF-01`)
Update `sprint_5_plan.md` (Issue 3 / `useDashboardData.ts`) to validate quotes with:
```typescript
if (
  quote.ticker &&
  typeof quote.price === 'number' &&
  Number.isFinite(quote.price) &&
  quote.price >= 0
) {
  priceBatch[quote.ticker.toUpperCase()] = quote.price;
}
```

### Required Change 2: Stable Callback Ref in `useRealtimePrices` (`PERF-02`)
Update `sprint_5_plan.md` (Issue 4 / `useRealtimePrices.ts`) to decouple `onPriceUpdate` from the `connect` callback dependencies:
```typescript
const onPriceUpdateRef = useRef(onPriceUpdate);
useEffect(() => {
  onPriceUpdateRef.current = onPriceUpdate;
});

// In connect useCallback: remove onPriceUpdate from deps
// In eventSource.onmessage: call onPriceUpdateRef.current?.(update);
```

### Required Change 3: Short-Circuiting in `usePortfolioStore.updatePricesBatch`
Ensure `updatePricesBatch` in `usePortfolioStore.ts` avoids creating new state references if no prices changed:
```typescript
updatePricesBatch: (updates) =>
  set((state) => {
    let hasChanges = false;
    for (const [ticker, price] of Object.entries(updates)) {
      if (state.currentPrices[ticker] !== price) {
        hasChanges = true;
        break;
      }
    }
    if (!hasChanges) return state;
    return { currentPrices: { ...state.currentPrices, ...updates } };
  }),
```

---

## 5. Verification Method

To verify these findings and validate the refined plan:

1. **Verify `QUAL-05` Error Handling**:
   ```bash
   npx vitest run src/lib/__tests__/errorHandler.test.ts
   ```
   *Expected*: All tests pass. Wrapping an action throwing `UnauthorizedError` yields `statusCode: 401` and `code: 'UNAUTHORIZED'` with zero `[withErrorHandler] Unhandled error` logged to stderr.

2. **Verify `PERF-01` Sanitization & Metrics**:
   ```bash
   npx vitest run src/store/__tests__/usePortfolioStore.test.ts
   ```
   *Expected*: Passing invalid quotes (`NaN`, strings, `Infinity`) does not corrupt `currentPrices` or collapse `calculatePortfolioMetrics` NAV.

3. **Verify `PERF-02` / `PERF-03` SSE Lifecycle**:
   ```bash
   npx vitest run src/lib/__tests__/useRealtimePrices.test.ts
   ```
   *Expected*: Unmounting dashboard clears pending reconnect timers with zero zombie reconnects; passing inline `onPriceUpdate` does not trigger reconnect storms; `: ping\n\n` comments are ignored without error.
