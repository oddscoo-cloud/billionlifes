const endpoint = 'https://api.web3forms.com/submit';
const keyFormat = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;

export function feedbackAccessKey(value: unknown): string | null {
  return typeof value === 'string' && keyFormat.test(value.trim()) ? value.trim() : null;
}

export interface FeedbackMessage {
  readonly category: string;
  readonly name: string;
  readonly email: string;
  readonly message: string;
}

export type FeedbackResult = 'sent' | 'rate-limited' | 'rejected' | 'unconfirmed';

export async function sendFeedback(
  accessKey: string, feedback: FeedbackMessage, request: typeof fetch = fetch,
): Promise<FeedbackResult> {
  try {
    const response = await request(endpoint, {
      method: 'POST',
      credentials: 'omit',
      redirect: 'error',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({
        access_key: accessKey,
        from_name: 'Beyond Birth',
        subject: `[Beyond Birth] ${feedback.category}`,
        category: feedback.category,
        ...(feedback.name ? { name: feedback.name } : {}),
        ...(feedback.email ? { email: feedback.email } : {}),
        message: feedback.message,
        botcheck: false,
      }),
    });
    if (response.status === 429) return 'rate-limited';
    if (!response.ok) return 'rejected';
    const result: unknown = await response.json();
    return result && typeof result === 'object' && 'success' in result && result.success === true
      ? 'sent' : 'rejected';
  } catch {
    return 'unconfirmed';
  }
}
