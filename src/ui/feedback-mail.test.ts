import { expect, it, vi } from 'vitest';
import { feedbackAccessKey, sendFeedback } from './feedback-mail';

const key = '00000000-0000-4000-8000-000000000000';
const feedback = { category: 'Suggestion', name: 'Alex', email: 'alex@example.com', message: 'A test message.' };

it('sends only the feedback fields and the public identifier, with no recipient in the request', async () => {
  const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ success: true }));
  await expect(sendFeedback(key, feedback, request)).resolves.toBe('sent');
  const [url, init] = request.mock.calls[0]!;
  expect(url).toBe('https://api.web3forms.com/submit');
  expect(JSON.parse(String(init?.body))).toEqual({
    ...feedback, access_key: key, subject: '[Beyond Birth] Suggestion', from_name: 'Beyond Birth', botcheck: false,
  });
});

it('requires provider confirmation and distinguishes rejected, limited and uncertain submissions', async () => {
  const request = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ success: false }))
    .mockResolvedValueOnce(Response.json({ success: false }, { status: 429 }))
    .mockRejectedValueOnce(new TypeError('network unavailable'));
  await expect(sendFeedback(key, feedback, request)).resolves.toBe('rejected');
  await expect(sendFeedback(key, feedback, request)).resolves.toBe('rate-limited');
  await expect(sendFeedback(key, feedback, request)).resolves.toBe('unconfirmed');
  expect(feedbackAccessKey('recipient@example.com')).toBeNull();
  expect(feedbackAccessKey(key)).toBe(key);
});
