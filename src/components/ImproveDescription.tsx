import { answerMarkup } from '../utils/answerMarkup';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { completeDeepseekChat, DEEPSEEK_TOKEN_STORAGE_KEY, DEFAULT_DEEPSEEK_SYSTEM_PROMPT, CHATZONE_RULE, DeepseekMode } from '../services/deepseek';

type Phase = 'idle' | 'loading' | 'preview' | 'applying' | 'success' | 'error';

const STUDIO_TOKEN_KEY = `studio:${DEEPSEEK_TOKEN_STORAGE_KEY}`;

function SparkleIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 1.2l1.05 3.35L12.4 5.6 9.05 6.65 8 10 6.95 6.65 3.6 5.6l3.35-1.05L8 1.2zm4.2 7.1.55 1.75 1.75.55-1.75.55-.55 1.75-.55-1.75-1.75-.55 1.75-.55.55-1.75zM3.1 9.2l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7.7-1.9z"
      />
    </svg>
  );
}

export default function ImproveDescription({
  issueKey,
  onApplied,
}: {
  issueKey: string;
  onApplied: (description: string) => void;
}) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [preview, setPreview] = useState('');
  const [reply, setReply] = useState('');
  const [successText, setSuccessText] = useState('');
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const requestRef = useRef(0);

  useEffect(() => {
    requestRef.current += 1;
    setPhase('idle');
    setPreview('');
    setReply('');
    setSuccessText('');
    setError('');
    setToken(window.localStorage.getItem(STUDIO_TOKEN_KEY) || '');
  }, [issueKey]);

  const rememberToken = (value: string) => {
    setToken(value);
    window.localStorage.setItem(STUDIO_TOKEN_KEY, value);
  };

  const run = async (mode: DeepseekMode, refining = false) => {
    const serial = ++requestRef.current;
    setError('');
    setPhase(mode === 'apply' ? 'applying' : 'loading');
    try {
      const text = await completeDeepseekChat(
        issueKey,
        mode,
        token.trim() || null,
        mode === 'apply' ? preview.split('\n\nПредложения и вопросы к согласованию\n')[0] : '',
        DEFAULT_DEEPSEEK_SYSTEM_PROMPT + "\n" + CHATZONE_RULE,
        refining ? { preview, reply } : undefined,
        mode === "apply" ? preview : ""
      );
      if (serial !== requestRef.current) return;
      if (mode === 'apply') {
        onApplied(preview.split('\n\nПредложения и вопросы к согласованию\n')[0]);
        setSuccessText(text);
        setPhase('success');
        return;
      }
      setPreview(text);
      setReply('');
      setPhase('preview');
    } catch (err) {
      if (serial !== requestRef.current) return;
      setError(err instanceof Error ? err.message : 'Не удалось получить ответ DeepSeek');
      setPhase(mode === 'apply' || refining ? 'preview' : 'error');
    }
  };

  const busy = phase === 'loading' || phase === 'applying';

  const sheet =
    phase === 'idle'
      ? null
      : createPortal(
          <aside
            role="dialog"
            aria-label="Улучшение описания"
            id="studio-deepseek-panel"
            className="fixed inset-y-0 right-0 z-[80] flex w-[min(640px,100vw)] flex-col overflow-auto rounded-[3px] border border-[#DFE1E6] bg-white p-4 text-[#172B4D] shadow-[0_8px_12px_rgba(9,30,66,0.15),0_0_1px_rgba(9,30,66,0.31)]"
            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, sans-serif' }}
          >
            <h2 className="m-0 text-base font-semibold leading-tight">Улучшить описание</h2>
            <p className="mb-3 mt-1 text-xs font-semibold text-[#626F86]">{issueKey}</p>

            <label className="mb-1 text-[11px] font-semibold text-[#44546F]" htmlFor="o3ds-studio-token">
              Bearer токен для предпросмотра
            </label>
            <input
              id="o3ds-studio-token"
              type="password"
              value={token}
              autoComplete="off"
              spellCheck={false}
              placeholder="Пусто — попробуем сессию deepseek.o3t.ru"
              onChange={(event) => rememberToken(event.target.value)}
              className="mb-3 h-8 w-full rounded-[3px] border-2 border-[#DFE1E6] px-2 text-sm text-[#172B4D] outline-none focus:border-[#0C66E4]"
            />

            {busy && (
              <div aria-busy="true">
                <p className="mb-2 text-xs font-semibold text-[#626F86]">
                  {phase === 'applying' ? 'Применяю изменения в задаче…' : 'Читаю задачу и связи…'}
                </p>
                <div className="mb-2 h-3 animate-pulse rounded-[3px] bg-[#F4F5F7]" />
                <div className="mb-2 h-3 animate-pulse rounded-[3px] bg-[#EBECF0]" />
                <div className="mb-3 h-3 w-3/5 animate-pulse rounded-[3px] bg-[#F4F5F7]" />
              </div>
            )}

            {error && <p className="mb-3 text-[13px] text-[#AE2E24]">{error}</p>}

            {phase === 'preview' && (
              <div className="studio-answer mb-3 min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words rounded-[3px] border border-[#DFE1E6] bg-[#F7F8F9] p-2.5 font-sans text-sm leading-relaxed text-[#172B4D]" dangerouslySetInnerHTML={{ __html: answerMarkup(preview) }} />
            )}

            {phase === 'success' && (
              <>
                <p className="mb-2 text-[13px] font-semibold text-[#216E4E]">
                  Изменения отправлены в задачу через jit. В предпросмотре студии описание обновлено локально.
                </p>
                <div className="studio-answer mb-3 min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words rounded-[3px] border border-[#DFE1E6] bg-[#F7F8F9] p-2.5 font-sans text-sm leading-relaxed text-[#172B4D]" dangerouslySetInnerHTML={{ __html: answerMarkup(successText) }} />
              </>
            )}

            {phase === 'preview' && <textarea rows={2} value={reply} onChange={event => {
              setReply(event.target.value);
              event.currentTarget.style.height = 'auto';
              event.currentTarget.style.height = Math.min(event.currentTarget.scrollHeight, 180) + 'px';
              event.currentTarget.style.overflowY = event.currentTarget.scrollHeight > 180 ? 'auto' : 'hidden';
            }}
              aria-label="Ответ на вопросы" placeholder="Ответ на вопросы или уточнение к описанию"
              className="mb-2 rounded-md border border-slate-300 p-2 text-sm" />}
            <div className="flex flex-wrap gap-2">
              {phase === 'preview' && <button type="button" disabled={!reply.trim()} onClick={() => run('analyze', true)}
                className="ozon-btn-surface rounded-md px-3 text-sm disabled:opacity-50">Отправить ответ</button>}
              {phase === 'error' && (
                <button
                  type="button"
                  onClick={() => run('analyze')}
                  className="h-8 cursor-pointer rounded-[3px] border-0 bg-[#0C66E4] px-3 text-sm font-semibold text-white hover:bg-[#0055CC]"
                >
                  Повторить
                </button>
              )}
              {phase === 'preview' && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run('apply')}
                  className="h-8 cursor-pointer rounded-[3px] border-0 bg-[#0C66E4] px-3 text-sm font-semibold text-white hover:bg-[#0055CC] disabled:cursor-default disabled:opacity-60"
                >
                  {/chatzone[.]o3t[.]ru/i.test(preview) ? 'Применить описание и ссылки' : 'Применить описание'}
                </button>
              )}
              {phase !== 'applying' && (
                <button
                  type="button"
                  onClick={() => {
                    requestRef.current += 1;
                    setPhase('idle');
                  }}
                  className="h-8 cursor-pointer rounded-[3px] border border-[#DFE1E6] bg-white px-3 text-sm font-semibold text-[#44546F] hover:bg-[#F7F8F9]"
                >
                  {phase === 'success' ? 'Закрыть' : 'Отмена'}
                </button>
              )}
            </div>
          </aside>,
          document.getElementById('studio-workspace') || document.body
        );

  return (
    <>
      <button
        type="button"
        disabled={busy}
        title="Улучшить описание через DeepSeek"
        onClick={() => run('analyze')}
        className="mt-0.5 inline-flex h-6 shrink-0 cursor-pointer items-center gap-1 rounded-[3px] border border-[#0C66E4] bg-white px-2 text-xs font-semibold text-[#0C66E4] hover:bg-[#E9F2FF] disabled:cursor-default disabled:opacity-60"
        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, sans-serif' }}
      >
        <SparkleIcon />
        Улучшить
      </button>
      {sheet}
    </>
  );
}
