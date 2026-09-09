'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { activeOrgId, apiFetch } from '@/lib/http/client';
import { getSectionAiAssist } from '@/lib/ai-intelligence/section-assist';

type Me = {
  actor: {
    permissions: string[];
    role: string;
  };
};

type Readiness = {
  provider: 'demo' | 'openai' | 'gemini';
  model: string;
  credentialConfigured: boolean;
  activePrompt: boolean;
  activeModel: boolean;
  liveReady: boolean;
  blockers: string[];
};

type RunResult = {
  status: 'completed' | 'blocked' | 'failed' | 'insufficient_evidence';
  provider: 'demo' | 'openai' | 'gemini';
  model: string;
  answer?: {
    summary: string;
    findings: string[];
    recommendations: Array<{
      title: string;
      rationale: string;
      priority: string;
    }>;
    limitations: string[];
    confidence: number;
    evidenceCompleteness: number;
    requiresHumanDecision: boolean;
  };
  blockedReason?: string;
};

export function ContextualAiAssist() {
  const pathname = usePathname();
  const config = useMemo(() => getSectionAiAssist(pathname), [pathname]);
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<RunResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [setupBusy, setSetupBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setQuestion('');
    setResult(null);
    setError('');
    setCopied(false);
  }, [pathname]);

  useEffect(() => {
    const onPageAssist = (event: Event) => {
      if (!config) return;
      const detail = (event as CustomEvent<{ prompt?: string }>).detail;
      const prompt = String(detail?.prompt || '').trim();
      setOpen(true);
      setResult(null);
      setError('');
      setCopied(false);
      if (prompt) setQuestion(prompt);
    };

    window.addEventListener('opsiqo:ai-assist', onPageAssist as EventListener);
    return () => window.removeEventListener('opsiqo:ai-assist', onPageAssist as EventListener);
  }, [config?.id]);

  async function load() {
    if (!config) return;
    try {
      const identity = await apiFetch<Me>('/api/me');
      setMe(identity);
      if (!identity.actor.permissions.includes('ai.use')) return;
      const orgId = activeOrgId();
      const response = await apiFetch<{ data: Readiness }>(
        `/api/organizations/${orgId}/ai-copilot/readiness`,
      );
      setReadiness(response.data);
    } catch {
      // Contextual AI is supplemental. Core HCM navigation must remain usable.
    }
  }

  useEffect(() => {
    void load();
  }, [config?.id]);

  if (!config || !me?.actor.permissions.includes('ai.use')) return null;

  const canInitialize =
    me.actor.permissions.includes('ai.manage') &&
    me.actor.permissions.includes('ai.approve') &&
    ['super_admin', 'org_admin', 'hr_admin'].includes(me.actor.role);

  async function initialize() {
    setSetupBusy(true);
    setError('');
    try {
      const response = await apiFetch<{ data: Readiness }>(
        `/api/organizations/${activeOrgId()}/ai-copilot/readiness`,
        {
          method: 'POST',
          body: JSON.stringify({ action: 'initialize' }),
        },
      );
      setReadiness(response.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to initialize governed AI.');
    } finally {
      setSetupBusy(false);
    }
  }

  async function ask(promptOverride?: string) {
    const prompt = (promptOverride || question).trim();
    if (prompt.length < 3) return;

    setBusy(true);
    setError('');
    setResult(null);
    setCopied(false);
    try {
      const response = await apiFetch<{ data: RunResult }>(
        `/api/organizations/${activeOrgId()}/ai-copilot/query`,
        {
          method: 'POST',
          body: JSON.stringify({
            question: `[Current OPSIQO section: ${config?.label || 'Current HCM section'}] ${prompt}`,
          }),
          reconcileOnServerError: false,
        },
      );
      setResult(response.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI assistance did not complete.');
    } finally {
      setBusy(false);
    }
  }

  async function copyGenerated() {
    const answer = result?.answer;
    if (!answer) return;
    const text = [
      answer.summary,
      ...answer.findings.map((item) => `• ${item}`),
    ].join('\n\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
  }

  return (
    <div
      data-opsiqo-contextual-ai="true"
      style={{
        position: 'fixed',
        right: 18,
        bottom: 82,
        zIndex: 90,
        width: open ? 'min(460px, calc(100vw - 24px))' : 'auto',
        maxHeight: 'calc(100vh - 110px)',
      }}
    >
      {!open ? (
        <button
          type="button"
          className="button"
          aria-label={`Open OPSIQO AI Assist for ${config.label}`}
          onClick={() => setOpen(true)}
          style={{ boxShadow: '0 8px 26px rgba(0,0,0,.18)' }}
        >
          ✦ AI Assist
        </button>
      ) : (
        <section
          className="card stack"
          aria-label={`OPSIQO AI Assist for ${config.label}`}
          style={{
            maxHeight: 'calc(100vh - 110px)',
            overflowY: 'auto',
            boxShadow: '0 16px 46px rgba(0,0,0,.24)',
          }}
        >
          <div className="row wrap">
            <div>
              <h2 className="sectionTitle">✦ OPSIQO AI Assist</h2>
              <div className="muted">{config.label} · {config.description}</div>
            </div>
            <button
              type="button"
              className="button secondary compact"
              onClick={() => setOpen(false)}
              aria-label="Close AI Assist"
            >
              Close
            </button>
          </div>

          <div className="row wrap">
            <span className="badge">
              {readiness?.liveReady
                ? `Live ${readiness.provider} · ${readiness.model}`
                : 'AI setup required'}
            </span>
            <span className="muted">
              Draft/advisory only · human-controlled
            </span>
          </div>

          {!readiness?.liveReady && (
            <div className="notice stack">
              <strong>Live AI is not ready for this organization.</strong>
              {readiness?.blockers?.length ? (
                <ul>
                  {readiness.blockers.map((item) => <li key={item}>{item}</li>)}
                </ul>
              ) : (
                <div>Checking governed AI configuration…</div>
              )}
              {canInitialize && (
                <button
                  type="button"
                  className="button"
                  disabled={setupBusy}
                  onClick={() => void initialize()}
                >
                  {setupBusy ? 'Initializing…' : 'Initialize governed AI'}
                </button>
              )}
              <Link href="/ai-copilot?tab=governance">
                Open AI governance
              </Link>
            </div>
          )}

          <div className="stack">
            <strong>Recommended AI help for this section</strong>
            <div className="row wrap">
              {config.presets.map((preset) => (
                <button
                  type="button"
                  className="button secondary compact"
                  key={preset.label}
                  disabled={busy || !readiness?.liveReady}
                  onClick={() => {
                    setQuestion(preset.prompt);
                    void ask(preset.prompt);
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <label className="field">
            <span>Ask or generate</span>
            <textarea
              className="input"
              rows={4}
              maxLength={3800}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder={`Ask OPSIQO AI for help with ${config.label.toLowerCase()}…`}
            />
          </label>
          <button
            type="button"
            className="button"
            disabled={busy || !readiness?.liveReady || question.trim().length < 3}
            onClick={() => void ask()}
          >
            {busy ? 'Generating with governed evidence…' : 'Generate with AI'}
          </button>

          {error && <div className="error" role="alert">{error}</div>}

          {result?.status === 'blocked' && (
            <div className="warning">
              <strong>Consequential AI use blocked.</strong>
              <div>{result.blockedReason}</div>
            </div>
          )}

          {result?.status === 'insufficient_evidence' && (
            <div className="notice">
              OPSIQO does not have enough governed evidence for this request.
              Add or correct source data rather than asking AI to invent it.
            </div>
          )}

          {result?.answer && (
            <div className="stack" data-opsiqo-ai-generated="true">
              <div className="row wrap">
                <strong>AI-generated draft / advice</strong>
                <span className="badge">
                  Confidence {result.answer.confidence}% · Evidence {result.answer.evidenceCompleteness}%
                </span>
              </div>
              <div className="notice" style={{ whiteSpace: 'pre-wrap' }}>
                {result.answer.summary}
              </div>
              {result.answer.findings.length > 0 && (
                <>
                  <strong>Evidence-grounded findings</strong>
                  <ul>
                    {result.answer.findings.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </>
              )}
              {result.answer.recommendations.length > 0 && (
                <>
                  <strong>Human review suggestions</strong>
                  <ul>
                    {result.answer.recommendations.map((item) => (
                      <li key={item.title}>
                        <strong>{item.title}</strong> — {item.rationale}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <div className="row wrap">
                <button
                  type="button"
                  className="button secondary compact"
                  onClick={() => void copyGenerated()}
                >
                  {copied ? 'Copied' : 'Copy generated text'}
                </button>
                <Link href="/ai-copilot">Open full AI Copilot</Link>
              </div>
              <small className="muted">
                AI-generated content is a draft. Review accuracy, citations, policy,
                privacy and legal implications before use. AI does not execute
                consequential employment decisions from this assistant.
              </small>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
