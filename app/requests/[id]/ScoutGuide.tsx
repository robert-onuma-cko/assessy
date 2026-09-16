'use client';

import { useState } from 'react';
import type { RequestState, RequestType } from '@prisma/client';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import {
  askForInformationAction,
  classifyRequestAction,
  recordOutcomeAction,
  rerouteDomainAction,
  sendToDomainAction,
  setIndicatorFlagAction,
} from '@/lib/actions';
import { CAPACITY_OUTCOMES, CORRECTION_REASON_CODES, REQUEST_TYPES, STATE_META } from '@/lib/taxonomy';
import { DOMAIN_OUTCOMES, TRIAGE_OUTCOMES, readyForDomain, validateOutcome } from '@/lib/triage-rules';

// Scout walks the decision-maker through triage one question at a time, in
// the thread, with option chips — the same surface the requester uses (design
// §3.3: the brief and the decision live on the record). Every chip that
// changes the record calls the same server actions the old panel did, so the
// rails in lib/triage-rules and the audit trail are unchanged; only the shape
// of the asking is. Free-text answers (a reason, a link, a question) come
// through the composer, which the guide takes over while it waits.
//
// The Q&A here is ephemeral UI state: the record only remembers what was
// written to it. Scout never decides — it asks, and records what the human
// picked.

export type DomainOption = { key: string; name: string; department: string; ownerName: string | null };
export type InitiativeOption = { ref: string; title: string };

export type GuideRequest = {
  id: string;
  state: RequestState;
  validatedFinalType: RequestType | null;
  receivingDomainKey: string | null;
  initiativeIndicatorFlag: boolean;
};

export type GuideInput = {
  request: GuideRequest;
  role: 'triage' | 'domain';
  domains: DomainOption[];
  initiatives: InitiativeOption[];
};

type Exchange = { id: string; from: 'scout' | 'me'; text: string };

type Step =
  | { kind: 'type' }
  | { kind: 'domain'; purpose: 'route' | 'reroute' }
  | { kind: 'reason-code'; then: () => void }
  | { kind: 'flag' }
  | { kind: 'next' }
  | { kind: 'outcome' }
  | { kind: 'initiative' }
  | { kind: 'capacity' }
  | { kind: 'text'; field: 'question' | 'reason' | 'link' | 'displaced' | 'reroute-reason'; required: boolean }
  | { kind: 'restart' }
  | { kind: 'idle' };

export type TextPrompt = { placeholder: string; submit: (text: string) => void; skip?: () => void };

const OPEN_STATES: RequestState[] = ['SUBMITTED', 'CLARIFYING', 'READY_FOR_REVIEW', 'REQUESTER_CONFIRMED'];

function firstStep(input: GuideInput): Step {
  const { request, role } = input;
  if (role === 'triage' && OPEN_STATES.includes(request.state)) {
    if (!request.validatedFinalType) return { kind: 'type' };
    if (!request.receivingDomainKey) return { kind: 'domain', purpose: 'route' };
    return { kind: 'next' };
  }
  if (request.state === 'AWAITING_DOMAIN_DECISION') return { kind: 'next' };
  return { kind: 'idle' };
}

let seq = 0;
const nextId = () => `guide-${++seq}`;

export function useScoutGuide(input: GuideInput | null) {
  const [step, setStep] = useState<Step>(() => (input ? firstStep(input) : { kind: 'idle' }));
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<{
    outcome?: RequestState;
    linkedInitiativeRef?: string;
    capacityOutcome?: string;
    displacedInitiative?: string;
    routingUrl?: string;
    reason?: string;
    rerouteDomainKey?: string;
    pendingType?: string;
    pendingDomain?: string;
  }>({});

  const say = (from: Exchange['from'], text: string) =>
    setExchanges((x) => [...x, { id: nextId(), from, text }]);

  // After a write that the record now shows for itself (a posted question, a
  // routing, a decision), the ephemeral Q&A would duplicate it — so it is
  // dropped and Scout re-asks from the record's new state.
  const restart = () => {
    setExchanges([]);
    setStep({ kind: 'restart' });
  };

  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>, onOk: () => void) => {
    setBusy(true);
    const r = await fn();
    setBusy(false);
    if (!r.ok) {
      toast.error(r.error ?? 'Something went wrong.');
      return;
    }
    onOk();
  };

  if (!input) return { bubbles: null, exchanges: [] as Exchange[], textPrompt: null as TextPrompt | null, busy: false };
  const { request, role, domains, initiatives } = input;
  const current: Step = step.kind === 'restart' ? firstStep(input) : step;
  const domainName = (key: string | null | undefined) => domains.find((d) => d.key === key)?.name ?? key ?? '';
  const awaiting = request.state === 'AWAITING_DOMAIN_DECISION';

  // ── classification ──────────────────────────────────────────────────────

  const saveType = (type: string, reasonCode?: string) => {
    const fd = new FormData();
    fd.set('validatedFinalType', type);
    fd.set('receivingDomainKey', request.receivingDomainKey ?? '');
    if (reasonCode) fd.set('reasonCode', reasonCode);
    run(
      () => classifyRequestAction(request.id, fd),
      () => setStep(request.receivingDomainKey ? { kind: 'next' } : { kind: 'domain', purpose: 'route' }),
    );
  };

  const pickType = (type: string) => {
    say('me', REQUEST_TYPES[type as RequestType].label);
    if (request.validatedFinalType && request.validatedFinalType !== type) {
      setDraft((d) => ({ ...d, pendingType: type }));
      setStep({ kind: 'reason-code', then: () => {} });
      return;
    }
    saveType(type);
  };

  const saveDomain = (key: string, reasonCode?: string) => {
    const fd = new FormData();
    fd.set('validatedFinalType', request.validatedFinalType ?? '');
    fd.set('receivingDomainKey', key);
    if (reasonCode) fd.set('reasonCode', reasonCode);
    run(
      () => classifyRequestAction(request.id, fd),
      () => setStep(request.initiativeIndicatorFlag ? { kind: 'next' } : { kind: 'flag' }),
    );
  };

  const pickDomain = (key: string) => {
    say('me', domainName(key));
    if (current.kind === 'domain' && current.purpose === 'reroute') {
      setDraft((d) => ({ ...d, rerouteDomainKey: key }));
      setStep({ kind: 'text', field: 'reroute-reason', required: true });
      return;
    }
    if (request.receivingDomainKey && request.receivingDomainKey !== key) {
      setDraft((d) => ({ ...d, pendingDomain: key }));
      setStep({ kind: 'reason-code', then: () => {} });
      return;
    }
    saveDomain(key);
  };

  const pickReasonCode = (code: string) => {
    say('me', CORRECTION_REASON_CODES[code as keyof typeof CORRECTION_REASON_CODES]);
    if (draft.pendingType) {
      const t = draft.pendingType;
      setDraft((d) => ({ ...d, pendingType: undefined }));
      saveType(t, code);
    } else if (draft.pendingDomain) {
      const k = draft.pendingDomain;
      setDraft((d) => ({ ...d, pendingDomain: undefined }));
      saveDomain(k, code);
    }
  };

  // ── flag ────────────────────────────────────────────────────────────────

  const pickFlag = (flag: boolean) => {
    say('me', flag ? 'Yes — flag it' : 'No indicators');
    if (!flag) {
      setStep({ kind: 'next' });
      return;
    }
    run(() => setIndicatorFlagAction(request.id, true, null), () => setStep({ kind: 'next' }));
  };

  // ── next action ─────────────────────────────────────────────────────────

  const startOutcome = (label: string) => {
    say('me', label);
    setDraft({});
    setStep({ kind: 'outcome' });
  };

  const pickOutcome = (outcome: RequestState) => {
    say('me', STATE_META[outcome].label);
    setDraft({ outcome });
    if (outcome === 'LINKED_TO_INITIATIVE') setStep({ kind: 'initiative' });
    else if (outcome === 'ACCEPTED_TO_BACKLOG') setStep({ kind: 'capacity' });
    else if (outcome === 'ADVANCED_TO_MCAP' || outcome === 'ROUTED_TO_INCIDENT') setStep({ kind: 'text', field: 'link', required: true });
    else if (outcome === 'RESOLVED_SELF_SERVICE' || outcome === 'REJECTED_REDIRECTED') setStep({ kind: 'text', field: 'link', required: false });
    else setStep({ kind: 'text', field: 'reason', required: true });
  };

  const finishOutcome = (reason: string) => {
    const input = { ...draft, outcome: draft.outcome!, reason };
    const errors = validateOutcome(input);
    if (Object.keys(errors).length) {
      toast.error(Object.values(errors).join(' '));
      return;
    }
    const fd = new FormData();
    for (const [k, v] of Object.entries(input)) if (v) fd.set(k, String(v));
    run(
      () => recordOutcomeAction(request.id, fd),
      restart,
    );
  };

  // ── what the composer should do right now ───────────────────────────────

  let textPrompt: TextPrompt | null = null;
  if (current.kind === 'text') {
    const step = current;
    const after = (text: string) => {
      if (text) say('me', text);
      switch (step.field) {
        case 'question':
          run(() => askForInformationAction(request.id, text), restart);
          break;
        case 'link':
          setDraft((d) => ({ ...d, routingUrl: text || undefined }));
          setStep({ kind: 'text', field: 'reason', required: true });
          break;
        case 'displaced':
          setDraft((d) => ({ ...d, displacedInitiative: text }));
          setStep({ kind: 'text', field: 'link', required: false });
          break;
        case 'reason':
          finishOutcome(text);
          break;
        case 'reroute-reason': {
          const fd = new FormData();
          fd.set('newDomainKey', draft.rerouteDomainKey ?? '');
          fd.set('reason', text);
          run(() => rerouteDomainAction(request.id, fd), restart);
          break;
        }
      }
    };
    const placeholders: Record<typeof step.field, string> = {
      question: 'Your question for the requester…',
      reason: 'Your reason — the requester reads this…',
      link: 'Paste the link…',
      displaced: 'Which initiative moves to make room…',
      'reroute-reason': 'Why that domain should own it…',
    };
    textPrompt = {
      placeholder: placeholders[step.field],
      submit: after,
      skip: step.required ? undefined : () => after(''),
    };
  }

  // ── Scout's current question ─────────────────────────────────────────────

  const chip = (label: string, onClick: () => void, tone: 'default' | 'outline' | 'ghost' = 'outline') => (
    <Button key={label} type="button" size="xs" variant={tone} className="rounded-full" disabled={busy} onClick={onClick}>
      {label}
    </Button>
  );

  let question: { text: string; options: React.ReactNode } | null = null;

  switch (current.kind) {
    case 'type':
      question = {
        text: request.validatedFinalType
          ? `It is classified as ${REQUEST_TYPES[request.validatedFinalType].label}. Change it to…`
          : 'How should this be classified? Pick the type that fits best — you decide, I only ask.',
        options: Object.entries(REQUEST_TYPES).map(([k, v]) => chip(v.label, () => pickType(k))),
      };
      break;
    case 'domain':
      question = {
        text:
          current.purpose === 'reroute'
            ? 'Which domain should own it instead? You hold it until they accept.'
            : 'Which domain should receive it first? One domain owns the initial assessment; others can be engaged later.',
        options: <DomainPicker domains={domains} exclude={request.receivingDomainKey} onPick={pickDomain} />,
      };
      break;
    case 'reason-code':
      question = {
        text: 'That changes an existing decision. Why? (One reason code — it feeds the weekly quality review.)',
        options: Object.entries(CORRECTION_REASON_CODES).map(([k, v]) => chip(v, () => pickReasonCode(k))),
      };
      break;
    case 'flag':
      question = {
        text: 'Does this look like more than BAU — new capability, regulatory or scheme impact, pricing or geography change? A flag forces governance review and is sticky.',
        options: [chip('Yes — flag it', () => pickFlag(true)), chip('No indicators', () => pickFlag(false))],
      };
      break;
    case 'next': {
      const missing = readyForDomain(request);
      const opts: React.ReactNode[] = [];
      if (role === 'triage' && !awaiting) {
        if (missing.length === 0) {
          opts.push(
            chip(`Send to ${domainName(request.receivingDomainKey)}`, () => {
              say('me', `Send to ${domainName(request.receivingDomainKey)}`);
              run(() => sendToDomainAction(request.id), restart);
            }, 'default'),
          );
        }
        opts.push(
          chip('Ask the requester', () => {
            say('me', 'Ask the requester');
            setStep({ kind: 'text', field: 'question', required: true });
          }),
        );
      }
      if (awaiting) {
        opts.push(chip('Re-route', () => {
          say('me', 'Re-route');
          setStep({ kind: 'domain', purpose: 'reroute' });
        }));
      }
      const outcomeLabel = awaiting && role === 'domain' ? 'Decide' : 'Record an outcome';
      opts.push(chip(outcomeLabel, () => startOutcome(outcomeLabel), awaiting ? 'default' : 'outline'));
      if (role === 'triage') {
        opts.push(chip('Change classification', () => {
          say('me', 'Change classification');
          setStep({ kind: 'type' });
        }, 'ghost'));
      }
      if (!request.initiativeIndicatorFlag) {
        opts.push(chip('Flag as potential initiative', () => pickFlag(true), 'ghost'));
      }
      const summary = [
        request.validatedFinalType ? REQUEST_TYPES[request.validatedFinalType].label : null,
        request.receivingDomainKey ? domainName(request.receivingDomainKey) : null,
        request.initiativeIndicatorFlag ? 'indicator flag set' : null,
      ].filter(Boolean).join(' · ');
      question = {
        text:
          role === 'domain'
            ? `This has been routed to ${domainName(request.receivingDomainKey)} for your decision${summary ? ` (${summary})` : ''}. Confirming is not a delivery commitment. What would you like to do?`
            : `${summary ? `So far: ${summary}. ` : ''}${missing.length ? `Still needed before it can go to a domain: ${missing.join(' and ')}. ` : ''}What next?`,
        options: opts,
      };
      break;
    }
    case 'outcome': {
      const menu = role === 'domain' ? DOMAIN_OUTCOMES : awaiting ? [...TRIAGE_OUTCOMES, ...DOMAIN_OUTCOMES] : TRIAGE_OUTCOMES;
      question = {
        text: 'Which outcome? Exactly one, chosen by you — I will post your reason to the thread and tell the requester.',
        options: menu.map((o) => chip(STATE_META[o].label, () => pickOutcome(o))),
      };
      break;
    }
    case 'initiative':
      question = {
        text: 'Which existing initiative is this the same need as? I suggest, never auto-link.',
        options: (
          <ListPicker
            placeholder="Search Hive initiatives…"
            items={initiatives.map((i) => ({ value: i.ref, label: i.title }))}
            onPick={(ref, label) => {
              say('me', label);
              setDraft((d) => ({ ...d, linkedInitiativeRef: ref }));
              setStep({ kind: 'text', field: 'reason', required: true });
            }}
          />
        ),
      };
      break;
    case 'capacity':
      question = {
        text: 'How does it fit your capacity? Recorded as data — nothing here computes displacement.',
        options: Object.entries(CAPACITY_OUTCOMES).map(([k, v]) =>
          chip(v, () => {
            say('me', v);
            setDraft((d) => ({ ...d, capacityOutcome: k }));
            setStep(k === 'resequence' ? { kind: 'text', field: 'displaced', required: true } : { kind: 'text', field: 'link', required: false });
          }),
        ),
      };
      break;
    case 'text': {
      const step = current;
      const texts: Record<typeof step.field, string> = {
        question: 'What do you want to ask? Say why you are asking — it helps them answer well. Type it below.',
        reason: 'Last thing: why? Written for the requester — they read this. Type it below.',
        link:
          draft.outcome === 'ADVANCED_TO_MCAP'
            ? 'Paste the Hive initiative link — the Initiative Owner registers it there; I never create the record.'
            : draft.outcome === 'ROUTED_TO_INCIDENT'
              ? 'Paste the incident link so the trail survives.'
              : 'Where did the work go? A Jira issue, KB page or redirect link — optional.',
        displaced: 'Which initiative is being re-sequenced to make room? Type its name below.',
        'reroute-reason': 'Why should that domain own it? Type it below — it is logged as a wrong-domain correction.',
      };
      question = {
        text: texts[step.field],
        options: step.required ? null : chip('Skip', () => textPrompt?.skip?.(), 'ghost'),
      };
      break;
    }
    case 'idle':
    case 'restart':
      question = null;
  }

  const bubbles = (
    <>
      {exchanges.map((e) => (
        <GuideBubble key={e.id} from={e.from} text={e.text} />
      ))}
      {question && <GuideBubble from="scout" text={question.text} options={question.options} thinking={busy} />}
    </>
  );

  return { bubbles, exchanges, textPrompt, busy };
}

// A Scout-styled bubble with the option chips under it — the same shape as a
// thread message, so the guide reads as part of the conversation.
function GuideBubble({
  from,
  text,
  options,
  thinking,
}: {
  from: 'scout' | 'me';
  text: string;
  options?: React.ReactNode;
  thinking?: boolean;
}) {
  const mine = from === 'me';
  return (
    <li className={`flex max-w-[85%] flex-col gap-1.5 ${mine ? 'self-end items-end' : 'self-start items-start'}`}>
      {!mine && (
        <div className="flex items-center gap-2 px-1">
          <ScoutMarkLazy thinking={thinking} />
          <span className="text-xs font-medium text-muted-foreground">Scout</span>
        </div>
      )}
      <div
        className={`rounded-xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
          mine ? 'rounded-tr-sm bg-primary text-primary-foreground' : 'rounded-tl-sm border bg-card'
        }`}
      >
        {text}
      </div>
      {options && <div className="flex flex-wrap gap-1.5 px-1">{options}</div>}
    </li>
  );
}

import { ScoutMark } from '@/components/ScoutMark';
function ScoutMarkLazy({ thinking }: { thinking?: boolean }) {
  return <ScoutMark size={16} thinking={thinking} />;
}

function DomainPicker({
  domains,
  exclude,
  onPick,
}: {
  domains: DomainOption[];
  exclude: string | null;
  onPick: (key: string) => void;
}) {
  const byDept = domains.reduce<Record<string, DomainOption[]>>((acc, d) => {
    if (d.key === exclude) return acc;
    (acc[d.department] ??= []).push(d);
    return acc;
  }, {});
  return (
    <Command className="w-full max-w-md rounded-lg border bg-popover">
      <CommandInput placeholder="Search domains…" />
      <CommandList className="max-h-56">
        <CommandEmpty>No domain matches.</CommandEmpty>
        {Object.entries(byDept).map(([dept, list]) => (
          <CommandGroup key={dept} heading={dept}>
            {list.map((d) => (
              <CommandItem key={d.key} value={`${d.name} ${d.department} ${d.ownerName ?? ''}`} onSelect={() => onPick(d.key)}>
                <span className="truncate">{d.name}</span>
                {d.ownerName && <span className="ml-auto text-xs text-muted-foreground">{d.ownerName}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </Command>
  );
}

function ListPicker({
  placeholder,
  items,
  onPick,
}: {
  placeholder: string;
  items: { value: string; label: string }[];
  onPick: (value: string, label: string) => void;
}) {
  return (
    <Command className="w-full max-w-md rounded-lg border bg-popover">
      <CommandInput placeholder={placeholder} />
      <CommandList className="max-h-56">
        <CommandEmpty>Nothing matches.</CommandEmpty>
        {items.map((i) => (
          <CommandItem key={i.value} value={i.label} onSelect={() => onPick(i.value, i.label)}>
            <span className="truncate">{i.label}</span>
          </CommandItem>
        ))}
      </CommandList>
    </Command>
  );
}
