#!/usr/bin/env node
import { runBoundedProcess } from './opsiqo85-v7-32-bounded-process.mjs';

const started = Date.now();
const result = await runBoundedProcess({
  command: process.execPath,
  args: ['-e', 'setInterval(()=>{},1000)'],
  timeoutMs: 500,
});

const durationMs = Date.now() - started;
const ok = result.timedOut === true && durationMs < 5000;

console.log(JSON.stringify({
  status: ok ? 'PASS' : 'FAIL',
  timedOut: result.timedOut === true,
  durationMs,
}));

process.exit(ok ? 0 : 1);
