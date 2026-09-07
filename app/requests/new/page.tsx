import { PageContainer } from '@/components/PageContainer';
import { ScoutMark } from '@/components/ScoutMark';
import { NewRequestForm } from './NewRequestForm';

export default function NewRequestPage() {
  return (
    <PageContainer narrow className="space-y-6">
      {/* Scout's introduction — persona confined to the requester surface, and
          the decision honesty is in the copy from the first screen. */}
      <header className="flex items-start gap-3">
        <ScoutMark size={40} className="mt-0.5 shrink-0" />
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">Tell Scout what you need</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            I&rsquo;m Scout. I structure your request for the right team — I&rsquo;ll suggest a
            route, and a human always decides. You don&rsquo;t need to know which team owns it.
          </p>
        </div>
      </header>

      <NewRequestForm />
    </PageContainer>
  );
}
