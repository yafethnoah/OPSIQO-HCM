'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getSectionAiAssist } from '@/lib/ai-intelligence/section-assist';
import { getPageExperience } from '@/lib/experience/page-experience';

type GuideMode = 'guided' | 'expert';
type StoredState = { completed: number[]; expanded: boolean; mode: GuideMode };

function safeRead(key: string): StoredState | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredState;
    return {
      completed: Array.isArray(parsed.completed) ? parsed.completed.filter(Number.isInteger) : [],
      expanded: Boolean(parsed.expanded),
      mode: parsed.mode === 'expert' ? 'expert' : 'guided',
    };
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: StoredState) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local persistence is optional. Core page use must never depend on it.
  }
}

export function PageExperienceLayer({ publicMode = false }: Readonly<{ publicMode?: boolean }>) {
  const pathname = usePathname();
  const experience = useMemo(() => getPageExperience(pathname), [pathname]);
  const aiConfig = useMemo(() => publicMode ? null : getSectionAiAssist(pathname), [pathname, publicMode]);
  const storageKey = `opsiqo:page-guide:${pathname}`;
  const [mode, setMode] = useState<GuideMode>('guided');
  const [expanded, setExpanded] = useState(false);
  const [completed, setCompleted] = useState<number[]>([]);
  const [arabic, setArabic] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [previewPrompt, setPreviewPrompt] = useState<string | null>(null);

  useEffect(() => {
    const saved = safeRead(storageKey);
    setMode(saved?.mode || 'guided');
    setExpanded(saved?.expanded ?? false);
    setCompleted(saved?.completed || []);
    setPreviewPrompt(null);
  }, [storageKey]);

  useEffect(() => {
    safeWrite(storageKey, { completed, expanded, mode });
  }, [storageKey, completed, expanded, mode]);

  useEffect(() => {
    const sync = () => {
      const root = document.documentElement;
      setArabic(root.lang.toLowerCase().startsWith('ar') || root.dir === 'rtl');
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang', 'dir'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const host = document.getElementById('main-content');
    if (!host) return;
    const scan = () => {
      const nodes = Array.from(host.querySelectorAll('[role="alert"], .error, [data-error="true"]'));
      const visible = nodes.filter((node) => {
        const element = node as HTMLElement;
        return element.offsetParent !== null && (element.textContent || '').trim().length > 0;
      });
      setAlertCount(visible.length);
    };
    scan();
    const observer = new MutationObserver(scan);
    observer.observe(host, { subtree: true, childList: true, attributes: true });
    return () => observer.disconnect();
  }, [pathname]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey && event.shiftKey && event.key.toLowerCase() === 'g') {
        event.preventDefault();
        setExpanded((value) => !value);
      }
      if (event.key === 'Escape') setPreviewPrompt(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const onProgress = (event: Event) => {
      const detail = (event as CustomEvent<{ step?: number; steps?: number[] }>).detail;
      const requested = Array.isArray(detail?.steps)
        ? detail.steps
        : Number.isInteger(detail?.step)
          ? [detail.step as number]
          : [];
      const valid = requested.filter(
        (value) => Number.isInteger(value) && value >= 0 && value < experience.steps.length,
      );
      if (!valid.length) return;
      setCompleted((current) =>
        Array.from(new Set([...current, ...valid])).sort((a, b) => a - b),
      );
    };

    window.addEventListener('opsiqo:guide-progress', onProgress as EventListener);
    return () => window.removeEventListener('opsiqo:guide-progress', onProgress as EventListener);
  }, [experience.steps.length]);

  const title = arabic ? experience.titleAr : experience.titleEn;
  const purpose = arabic ? experience.purposeAr : experience.purposeEn;
  const next = arabic ? experience.nextAr : experience.nextEn;
  const steps = experience.steps.map((step) => arabic ? step.ar : step.en);
  const example = arabic ? experience.exampleAr : experience.exampleEn;
  const progress = steps.length ? Math.round((completed.length / steps.length) * 100) : 0;

  function toggleStep(index: number) {
    setCompleted((current) =>
      current.includes(index)
        ? current.filter((value) => value !== index)
        : [...current, index].sort((a, b) => a - b),
    );
  }

  function openAi(prompt: string) {
    if (!aiConfig) return;
    window.dispatchEvent(new CustomEvent('opsiqo:ai-assist', { detail: { prompt } }));
  }

  const nextPrompt = `What should I do next on ${experience.titleEn}? Identify the detected issue or next task, why it matters, supporting evidence, responsible owner, timing, confidence and approval status. Do not execute a consequential employment decision.`;
  const blockerPrompt = `Explain what is blocking progress on ${experience.titleEn}. Use governed evidence, identify missing or conflicting information, and give direct repair steps. Do not invent missing facts.`;
  const documentPrompt = `For ${experience.titleEn}, identify any missing forms or documents that can be safely prepared as drafts. Preview what would be generated, what verified data can be reused, and what information still requires human confirmation. Do not execute or approve the underlying HR decision.`;

  return (
    <section
      data-opsiqo-page-experience="true"
      aria-labelledby="opsiqo-page-guide-title"
      style={{
        marginBottom: 16,
        border: '1px solid var(--border, rgba(127,127,127,.28))',
        borderRadius: 16,
        padding: 14,
        background: 'var(--card, rgba(255,255,255,.04))',
      }}
    >
      <div className="row wrap" style={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0, flex: '1 1 420px' }}>
          <div className="row wrap" style={{ gap: 8 }}>
            <span className="badge">{arabic ? 'دليل الصفحة' : 'Page guide'}</span>
            <span className="badge">{mode === 'guided' ? (arabic ? 'وضع الإرشاد' : 'Guided mode') : (arabic ? 'وضع الخبير' : 'Expert mode')}</span>
            {alertCount > 0 && <span className="badge">{arabic ? `${alertCount} تنبيه` : `${alertCount} issue signal${alertCount === 1 ? '' : 's'}`}</span>}
          </div>
          <h2 id="opsiqo-page-guide-title" className="sectionTitle" style={{ marginTop: 8 }}>{title}</h2>
          <div>{purpose}</div>
          <div className="muted" style={{ marginTop: 6 }}>
            <strong>{arabic ? 'الإجراء التالي:' : 'Recommended next action:'}</strong> {next}
          </div>
        </div>

        <div className="row wrap" style={{ gap: 8 }}>
          <button
            type="button"
            className="button secondary compact"
            style={{ minHeight: 44 }}
            onClick={() => setMode((value) => value === 'guided' ? 'expert' : 'guided')}
          >
            {mode === 'guided'
              ? (arabic ? 'استخدام وضع الخبير' : 'Use expert mode')
              : (arabic ? 'استخدام وضع الإرشاد' : 'Use guided mode')}
          </button>
          <button
            type="button"
            className="button secondary compact"
            style={{ minHeight: 44 }}
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? (arabic ? 'إخفاء الدليل' : 'Hide guide') : (arabic ? 'فتح الدليل' : 'Open guide')}
          </button>
        </div>
      </div>

      {mode === 'guided' && (
        <div style={{ marginTop: 12 }}>
          <div className="row wrap" style={{ justifyContent: 'space-between' }}>
            <strong>{arabic ? 'تقدم دليل الصفحة' : 'Page-guide progress'}</strong>
            <span className="muted">{completed.length}/{steps.length} · {progress}%</span>
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            aria-label={arabic ? 'تقدم دليل الصفحة' : 'Page-guide progress'}
            style={{ height: 8, borderRadius: 999, overflow: 'hidden', background: 'var(--border, rgba(127,127,127,.25))', marginTop: 6 }}
          >
            <div style={{ width: `${progress}%`, height: '100%', background: 'currentColor', opacity: .62 }} />
          </div>
        </div>
      )}

      {expanded && (
        <div className="stack" style={{ marginTop: 14 }}>
          {mode === 'guided' && (
            <>
              <strong>{arabic ? 'خطوات إرشادية' : 'Guided steps'}</strong>
              <div className="stack" role="group" aria-label={arabic ? 'خطوات دليل الصفحة' : 'Page guide checklist'}>
                {steps.map((step, index) => (
                  <label key={`${experience.id}-${index}`} className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
                    <input
                      type="checkbox"
                      checked={completed.includes(index)}
                      onChange={() => toggleStep(index)}
                      style={{ width: 20, height: 20, marginTop: 2 }}
                    />
                    <span>{step}</span>
                  </label>
                ))}
              </div>
              <small className="muted">
                {arabic
                  ? 'يتم حفظ تقدم الدليل محلياً في هذا المتصفح. هذا لا يعني اكتمال سير العمل أو الموافقة على الإجراء.'
                  : 'Guide progress is saved locally and may advance after successful governed actions. It can also be checked manually; guide progress never approves a consequential action.'}
              </small>
              <div className="notice">{example}</div>
            </>
          )}

          <div className="row wrap" style={{ gap: 8 }}>
            {aiConfig && (
              <>
                <button
                  type="button"
                  className="button secondary compact"
                  style={{ minHeight: 44 }}
                  onClick={() => openAi(nextPrompt)}
                >
                  {arabic ? 'ماذا أفعل بعد ذلك؟' : 'What should I do next?'}
                </button>
                <button
                  type="button"
                  className="button secondary compact"
                  style={{ minHeight: 44 }}
                  onClick={() => openAi(blockerPrompt)}
                >
                  {arabic ? 'اشرح العوائق' : 'Explain blockers'}
                </button>
                <button
                  type="button"
                  className="button secondary compact"
                  style={{ minHeight: 44 }}
                  onClick={() => setPreviewPrompt(documentPrompt)}
                >
                  {arabic ? 'جهّز المستندات الناقصة' : 'Prepare missing documents'}
                </button>
              </>
            )}

            {alertCount > 0 && aiConfig && (
              <button
                type="button"
                className="button secondary compact"
                style={{ minHeight: 44 }}
                onClick={() => openAi(blockerPrompt)}
              >
                {arabic ? 'ساعدني في إصلاح المشكلة' : 'Help me repair the issue'}
              </button>
            )}

            {completed.length > 0 && (
              <button
                type="button"
                className="button secondary compact"
                style={{ minHeight: 44 }}
                onClick={() => setCompleted([])}
              >
                {arabic ? 'إعادة ضبط تقدم الدليل' : 'Reset guide progress'}
              </button>
            )}
          </div>

          {!aiConfig && !publicMode && (
            <small className="muted">
              {arabic
                ? 'المساعدة السياقية بالذكاء الاصطناعي غير مفعلة في هذه الصفحة وفق ضوابط الحوكمة.'
                : 'Contextual AI assistance is intentionally unavailable on this page under the current governance rules.'}
            </small>
          )}

          <small className="muted">
            {arabic
              ? 'اختصار لوحة المفاتيح: Alt + Shift + G لفتح أو إغلاق الدليل.'
              : 'Keyboard shortcut: Alt + Shift + G opens or closes this guide.'}
          </small>
        </div>
      )}

      {previewPrompt && aiConfig && (
        <div
          className="notice stack"
          role="dialog"
          aria-modal="false"
          aria-label={arabic ? 'معاينة إجراء OPSIQO' : 'OPSIQO action preview'}
          style={{ marginTop: 14 }}
        >
          <strong>{arabic ? 'معاينة قبل المتابعة' : 'Preview before continuing'}</strong>
          <div>
            {arabic
              ? 'سيفتح OPSIQO المساعد الخاضع للحوكمة لإعداد مسودة واقتراحات فقط. لن يتم تغيير السجلات أو إرسال إشعارات أو اتخاذ قرار توظيفي من هذا الإجراء.'
              : 'OPSIQO will open governed AI to prepare drafts and suggestions only. This action will not change records, send notifications or make an employment decision.'}
          </div>
          <div className="row wrap">
            <button
              type="button"
              className="button"
              style={{ minHeight: 44 }}
              onClick={() => {
                const prompt = previewPrompt;
                setPreviewPrompt(null);
                openAi(prompt);
              }}
            >
              {arabic ? 'متابعة إلى المساعد' : 'Continue to AI Assist'}
            </button>
            <button
              type="button"
              className="button secondary"
              style={{ minHeight: 44 }}
              onClick={() => setPreviewPrompt(null)}
            >
              {arabic ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      <span className="srOnly" aria-live="polite">
        {arabic
          ? `تقدم دليل الصفحة ${progress} بالمئة`
          : `Page guide progress ${progress} percent`}
      </span>
    </section>
  );
}
