## Promise.all–style orchestration

### What it is
- **Definition**: Fan-out/fan-in concurrency pattern. Launch multiple independent async tasks together and wait for all to finish. The overall operation succeeds only if every task succeeds; it fails fast if any task fails.

### Semantics (JavaScript)
- Input: iterable of promises (or values).
- Output: a single promise that:
  - **resolves** to an array of results in the same order as the inputs.
  - **rejects** immediately on the first rejection (others continue in the background unless you cancel them).

### Minimal example
```javascript
const urls = ['/api/a', '/api/b', '/api/c'];
const tasks = urls.map(u => fetch(u).then(r => r.json()));

try {
  const [a, b, c] = await Promise.all(tasks);
  console.log(a, b, c);
} catch (error) {
  console.error('At least one task failed:', error);
}
```

### Choosing the right aggregation primitive
- **Need all-or-nothing**: `Promise.all`
- **Need per-task outcomes (no fail-fast)**: `Promise.allSettled`
```javascript
const results = await Promise.allSettled(tasks);
// results[i] -> { status: 'fulfilled', value } | { status: 'rejected', reason }
```
- **First success wins**: `Promise.any`
- **First finished wins (success or failure)**: `Promise.race`

### Concurrency limits (important in practice)
`Promise.all` starts everything at once. To avoid overloading networks/CPUs, cap concurrency with a limiter such as `p-limit`:
```javascript
import pLimit from 'p-limit';

const limit = pLimit(5); // run up to 5 at a time
const limitedTasks = urls.map(u => limit(async () => {
  const res = await fetch(u);
  return res.json();
}));

const results = await Promise.all(limitedTasks);
```

### Cancellation
`Promise.all` does not cancel in-flight work on rejection. Use `AbortController` (when supported by the API) to stop remaining work:
```javascript
const ac = new AbortController();
const options = { signal: ac.signal };

try {
  const requests = urls.map(u => fetch(u, options));
  await Promise.all(requests);
} catch (e) {
  ac.abort(); // cancel any still-running requests
  throw e;
}
```

### Logging and staged observability
For production systems, add structured logs around each stage and each task to make parallel progress visible:
```javascript
const tasks = jobs.map((job, i) => (async () => {
  logger.info({ jobId: job.id, stage: 'start', index: i });
  try {
    const result = await processJob(job);
    logger.info({ jobId: job.id, stage: 'success', index: i });
    return result;
  } catch (err) {
    logger.error({ jobId: job.id, stage: 'error', index: i, err });
    throw err;
  }
})());

const results = await Promise.all(tasks);
```

### When to use
- Tasks are independent and can run in parallel.
- You need all results before continuing downstream logic.
- Unbounded parallelism is acceptable or you add a concurrency cap.

### Common pitfalls
- Launching too many tasks at once (exhausting file descriptors/CPU/bandwidth).
- Assuming `Promise.all` cancels other tasks on failure (it does not).
- Forgetting input-order guarantees when mapping results by index.

### In DaySave
- We run multiple analysis stages concurrently (e.g., transcription, object detection, OCR, thumbnailing, summarization) to minimize end-to-end latency under mixed I/O/CPU workloads.
- We combine `Promise.all` with staged logging for observability, and apply caps where external APIs or CPU-bound steps require throttling.

### Quick reference
- All succeed → array of values.
- Any fails → immediate rejection (no auto-cancel).
- Keep per-task outcomes → `Promise.allSettled`.
- Limit concurrency → use a pool/limiter (e.g., `p-limit`).

