/**
 * The link between this site and graph-support.
 *
 * The two halves answer different questions and neither is much use alone. An
 * entry here explains why a failure mode exists; a graph-support issue is one
 * occasion it happened to somebody, with the deployment ID, the commands run
 * and a stated disposition. A reader with a broken thing usually wants both.
 *
 * The loop is meant to run in both directions. Triage that turns up a failure
 * mode not in SYMPTOMS should add it here, otherwise the archive stays a pile
 * of threads that happen to be searchable.
 */
export const SUPPORT = {
  repo: 'https://github.com/nightswatchhq/graph-support',
  discord: 'https://discord.gg/CQewvyJ69Y',
} as const;

/** A worked case in the archive. `was` is what it actually turned out to be. */
export interface Worked {
  n: number;
  was: string;
}

export const issueUrl = (n: number) => `${SUPPORT.repo}/issues/${n}`;

/** Every issue, open and closed. The archive is the point of that repository. */
export const archiveUrl = `${SUPPORT.repo}/issues?q=is%3Aissue`;

/**
 * Prefilled against the symptom template. A reader arriving from a symptom has
 * already told us which one is missing by clicking, so the form should not ask
 * again. Anything not prefilled is a question they still have to answer, and
 * every one of those loses reporters.
 */
export function reportSymptomUrl(context?: string): string {
  const u = new URL(`${SUPPORT.repo}/issues/new`);
  u.searchParams.set('template', '06-symptom.yml');
  u.searchParams.set('labels', 'status/triage,kind/symptom');
  if (context) u.searchParams.set('title', `[symptom] ${context}`);
  return u.href;
}
