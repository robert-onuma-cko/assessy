import directory from './people-directory.json';

export interface DirectoryPerson {
  name: string;
  email: string;
  department?: string;
  location?: string;
  pillar?: string;
  /** "employee" or "contractor" (Workday "Contingent Worker"). */
  workerType?: 'employee' | 'contractor';
}

/**
 * Active worker roster pulled from BigQuery
 * (`cko-data-people-prod-8240.people_analytics.dim_employees`, filtered to
 * `is_active_worker = TRUE` and `worker_type IN ("Employee", "Contingent Worker")`).
 *
 * ~2.3k rows (employees + contractors). PersonPicker uses a typeahead so the
 * list size is fine on the client. Re-fetch via `bq query` (see CLAUDE.md or
 * the lib/people-directory.json header) when the org changes.
 */
export const PEOPLE_DIRECTORY: DirectoryPerson[] = directory as DirectoryPerson[];

const byEmail = new Map<string, DirectoryPerson>(
  PEOPLE_DIRECTORY.map((p) => [p.email.toLowerCase(), p]),
);
const byName = new Map<string, DirectoryPerson>(
  PEOPLE_DIRECTORY.map((p) => [p.name.toLowerCase(), p]),
);

export function findPerson(value: string | undefined | null): DirectoryPerson | undefined {
  if (!value) return undefined;
  const v = value.toLowerCase();
  return byEmail.get(v) ?? byName.get(v);
}

/** Resolve a stored value (email or legacy name) to a display name. */
export function displayPerson(value: string | undefined | null): string {
  if (!value) return '';
  return findPerson(value)?.name ?? value;
}

export function searchPeople(query: string, limit = 12): DirectoryPerson[] {
  const q = query.trim().toLowerCase();
  if (!q) return PEOPLE_DIRECTORY.slice(0, limit);
  // Cheap ranking: prefix match on name first, then substring on name or email.
  const prefix: DirectoryPerson[] = [];
  const sub: DirectoryPerson[] = [];
  for (const p of PEOPLE_DIRECTORY) {
    const n = p.name.toLowerCase();
    if (n.startsWith(q)) prefix.push(p);
    else if (n.includes(q) || p.email.toLowerCase().includes(q)) sub.push(p);
    if (prefix.length >= limit) break;
  }
  return [...prefix, ...sub].slice(0, limit);
}
