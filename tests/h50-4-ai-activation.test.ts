import { afterEach, describe, expect, it } from 'vitest';
import {
  credentialConfiguredFor,
  runtimeAiProviderState,
} from '../src/lib/ai-intelligence/activation';
import {
  getSectionAiAssist,
  sectionAiAssistConfigs,
} from '../src/lib/ai-intelligence/section-assist';

const originalProvider = process.env.OPSIQO_AI_PROVIDER;
const originalGeminiModel = process.env.GEMINI_MODEL;
const originalGeminiKey = process.env.GEMINI_API_KEY;

afterEach(() => {
  process.env.OPSIQO_AI_PROVIDER = originalProvider;
  process.env.GEMINI_MODEL = originalGeminiModel;
  process.env.GEMINI_API_KEY = originalGeminiKey;
});

describe('H50.4 governed AI activation', () => {
  it('reports live Gemini readiness without exposing credential material', () => {
    process.env.OPSIQO_AI_PROVIDER = 'gemini';
    process.env.GEMINI_MODEL = 'gemini-test-model';
    process.env.GEMINI_API_KEY = 'test-secret-that-must-never-be-returned';

    const state = runtimeAiProviderState();

    expect(state.provider).toBe('gemini');
    expect(state.model).toBe('gemini-test-model');
    expect(state.credentialConfigured).toBe(true);
    expect(JSON.stringify(state)).not.toContain(
      'test-secret-that-must-never-be-returned',
    );
    expect(credentialConfiguredFor('gemini')).toBe(true);
  });

  it('provides contextual AI assistance only for selected HCM sections', () => {
    expect(getSectionAiAssist('/recruiting')?.id).toBe('recruiting');
    expect(getSectionAiAssist('/performance/reviews')?.id).toBe('performance');
    expect(getSectionAiAssist('/employee-relations')?.id).toBe('er');
    expect(getSectionAiAssist('/admin-maintenance')).toBeNull();
    expect(getSectionAiAssist('/audit')).toBeNull();
  });

  it('keeps every contextual preset draft/advisory and human-controlled', () => {
    const allPrompts = sectionAiAssistConfigs()
      .flatMap((config) => config.presets.map((preset) => preset.prompt))
      .join('\n')
      .toLowerCase();

    expect(allPrompts).toContain('do not rank');
    expect(allPrompts).toContain('do not recommend an individual pay outcome');
    expect(allPrompts).toContain('do not assign an individual performance rating');
    expect(allPrompts).toContain('already been authorized by a human');
    expect(allPrompts).not.toContain('automatically terminate');
    expect(allPrompts).not.toContain('automatically hire');
  });
});
