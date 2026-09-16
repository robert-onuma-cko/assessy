'use client';

import { useEffect, useOptimistic, useRef, useState, useTransition } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { PaperPlaneRight } from '@phosphor-icons/react';
import { toast } from 'sonner';

import { ScoutMark } from '@/components/ScoutMark';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { postRequestMessage } from '@/lib/actions';
import { useScoutGuide, type GuideInput } from './ScoutGuide';

export type ThreadMessage = {
  id: string;
  role: 'REQUESTER' | 'SCOUT' | 'TRIAGE';
  content: string;
  createdAt: Date;
  authorName: string;
  /** null for Scout. */
  authorEmail: string | null;
  pending?: boolean;
};

// The conversation is the record (design §3.2): Scout speaks with its mark on
// the left, the current viewer's own messages sit on the right, everyone else
// on the left under their name. Optimistic — a sent message appears at once
// and Scout's wing-flutter stands in for a spinner until the server answers.
export function RequestThread({
  requestId,
  messages,
  viewerRole,
  viewerName,
  viewerEmail,
  guide,
}: {
  requestId: string;
  messages: ThreadMessage[];
  /** null → read-only (not the requester, not triage). */
  viewerRole: 'REQUESTER' | 'TRIAGE' | null;
  viewerName: string;
  viewerEmail: string;
  /** Scout's decision walk-through for triage leads / domain owners; null for everyone else. */
  guide: GuideInput | null;
}) {
  const [optimistic, addOptimistic] = useOptimistic(messages, (state, next: ThreadMessage) => [...state, next]);
  const [draft, setDraft] = useState('');
  const [isPending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scout = useScoutGuide(guide);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [optimistic.length, scout.exchanges.length, scout.textPrompt?.placeholder]);

  // While Scout is waiting for a typed answer (a reason, a link, a question),
  // the composer belongs to the guide; otherwise it posts to the thread.
  const canType = !!viewerRole || !!scout.textPrompt;

  const send = () => {
    const content = draft.trim();
    if (scout.textPrompt) {
      if (!content || scout.busy) return;
      setDraft('');
      scout.textPrompt.submit(content);
      textareaRef.current?.focus();
      return;
    }
    if (!content || !viewerRole || isPending) return;
    setDraft('');
    startTransition(async () => {
      addOptimistic({
        id: `pending-${Date.now()}`,
        role: viewerRole,
        content,
        createdAt: new Date(),
        authorName: viewerName,
        authorEmail: viewerEmail,
        pending: true,
      });
      try {
        await postRequestMessage(requestId, content);
      } catch (e) {
        setDraft(content);
        toast.error(e instanceof Error ? e.message : 'Could not send your message.');
      }
    });
    textareaRef.current?.focus();
  };

  return (
    <div className="flex min-h-[calc(100vh-3rem-2*var(--page-pad-y)-6rem)] flex-col">
      <ol className="flex flex-1 flex-col gap-3" aria-label="Conversation">
        {optimistic.map((m) => (
          <Message key={m.id} message={m} mine={m.authorEmail === viewerEmail} />
        ))}
        {scout.bubbles}
        {isPending && (
          <li className="flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
            <ScoutMark size={18} thinking />
            Scout is writing…
          </li>
        )}
        <div ref={endRef} />
      </ol>

      {canType ? (
        <form
          className="sticky bottom-0 -mx-1 mt-4 border-t bg-background/95 px-1 pt-3 pb-(--page-pad-y) backdrop-blur supports-backdrop-filter:bg-background/80"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <div
            className={`flex items-end gap-2 rounded-xl border bg-card p-2 focus-within:border-ring ${
              scout.textPrompt ? 'border-primary/50' : ''
            }`}
          >
            <Textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                // Enter sends; Shift+Enter is a newline — the chat convention.
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder={
                scout.textPrompt?.placeholder ??
                (viewerRole === 'TRIAGE' ? 'Reply as the triage team…' : 'Reply to Scout…')
              }
              aria-label="Your message"
              className="min-h-9 max-h-48 flex-1 border-0 bg-transparent px-2 py-1.5 shadow-none focus-visible:ring-0"
            />
            <Button type="submit" size="icon-sm" aria-label="Send" disabled={!draft.trim() || isPending || scout.busy}>
              <PaperPlaneRight weight="fill" />
            </Button>
          </div>
          <p className="mt-1.5 px-2 text-2xs text-tertiary-foreground">
            {scout.textPrompt
              ? 'Scout is waiting for your answer · Enter to send'
              : 'Enter to send · Shift+Enter for a new line · Scout suggests, your domain team decides.'}
          </p>
        </form>
      ) : (
        <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">
          You can read this record; only the requester and the triage team can post to it.
        </p>
      )}
    </div>
  );
}

function Message({ message: m, mine }: { message: ThreadMessage; mine: boolean }) {
  const isScout = m.role === 'SCOUT';
  return (
    <li className={`flex max-w-[85%] flex-col gap-1 ${mine ? 'self-end items-end' : 'self-start items-start'}`}>
      <div className="flex items-center gap-2 px-1">
        {isScout && <ScoutMark size={16} />}
        <span className="text-xs font-medium text-muted-foreground">{isScout ? 'Scout' : m.authorName}</span>
        <span className="text-2xs tabular-nums text-tertiary-foreground">
          {m.pending ? 'sending…' : `${formatDistanceToNowStrict(m.createdAt)} ago`}
        </span>
      </div>
      <div
        className={`rounded-xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
          mine
            ? 'rounded-tr-sm bg-primary text-primary-foreground'
            : isScout
              ? 'rounded-tl-sm border bg-card'
              : 'rounded-tl-sm bg-muted'
        } ${m.pending ? 'opacity-70' : ''}`}
      >
        {m.content}
      </div>
    </li>
  );
}
