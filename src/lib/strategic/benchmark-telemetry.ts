import {
  evaluateBenchmarks,
  strategicBenchmarks,
  type BenchmarkResult,
} from './benchmark-suite';

export type SafeBenchmarkDimensionKey =
  | 'surface'
  | 'locale'
  | 'channel'
  | 'release'
  | 'workflow';

export type SafeBenchmarkDimensions = Partial<
  Record<SafeBenchmarkDimensionKey, string>
>;

export interface StrategicBenchmarkObservation {
  key: string;
  value: number;
  recordedAt: string;
  dimensions: SafeBenchmarkDimensions;
}

export interface BenchmarkTelemetrySink {
  record(observation: StrategicBenchmarkObservation): Promise<void>;
}

const safeDimensionKeys: readonly SafeBenchmarkDimensionKey[] = [
  'surface',
  'locale',
  'channel',
  'release',
  'workflow',
];

export function buildBenchmarkObservation(input: {
  key: string;
  value: number;
  recordedAt: string;
  dimensions?: SafeBenchmarkDimensions;
}): StrategicBenchmarkObservation {
  const target = strategicBenchmarks.find(
    (candidate) => candidate.key === input.key,
  );

  if (!target) throw new Error(`unknown strategic benchmark: ${input.key}`);
  if (!Number.isFinite(input.value)) {
    throw new Error('benchmark value must be finite');
  }
  if (!isIsoLike(input.recordedAt)) {
    throw new Error('benchmark recordedAt must be ISO-like');
  }

  const dimensions = input.dimensions ?? {};
  validateDimensions(dimensions);

  return {
    key: target.key,
    value: input.value,
    recordedAt: input.recordedAt,
    dimensions: { ...dimensions },
  };
}

export async function recordStrategicBenchmark(
  input: {
    key: string;
    value: number;
    recordedAt: string;
    dimensions?: SafeBenchmarkDimensions;
  },
  sink: BenchmarkTelemetrySink,
): Promise<StrategicBenchmarkObservation> {
  const observation = buildBenchmarkObservation(input);
  await sink.record(observation);
  return observation;
}

export function evaluateStrategicObservations(
  observations: readonly StrategicBenchmarkObservation[],
): BenchmarkResult[] {
  const latest = new Map<string, StrategicBenchmarkObservation>();

  for (const observation of observations) {
    const current = latest.get(observation.key);
    if (!current || observation.recordedAt > current.recordedAt) {
      latest.set(observation.key, observation);
    }
  }

  return evaluateBenchmarks(
    [...latest.values()].map((observation) => ({
      key: observation.key,
      value: observation.value,
    })),
  );
}

function validateDimensions(dimensions: SafeBenchmarkDimensions): void {
  for (const [key, value] of Object.entries(dimensions)) {
    if (!safeDimensionKeys.includes(key as SafeBenchmarkDimensionKey)) {
      throw new Error(`unsafe benchmark dimension: ${key}`);
    }

    if (typeof value !== 'string') {
      throw new Error(`benchmark dimension ${key} must be text`);
    }

    if (value.length > 100) {
      throw new Error(`benchmark dimension ${key} is too long`);
    }

    if (value.includes('@') || value.includes('://') || /[\r\n]/.test(value)) {
      throw new Error(`benchmark dimension ${key} contains disallowed data`);
    }
  }
}

function isIsoLike(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T/.test(value);
}
