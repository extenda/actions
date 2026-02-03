import { retryUntil, setRetryDelay } from '../../src/utils/retry-until';

describe('utils/retry-until', () => {
  beforeEach(() => {
    setRetryDelay(100, 300);
  });

  test('It retries until success', async () => {
    let i = 0;
    const output = await retryUntil(
      () => {
        i += 1;
        return i;
      },
      (n) => n >= 4,
      500,
    );
    expect(output).toEqual(4);
  });

  test('It throws on timeout', async () => {
    let i = 0;
    await expect(() =>
      retryUntil(
        () => {
          i += 1;
          return i;
        },
        (n) => n > 10,
      ),
    ).rejects.toThrow(new Error('Timed out waiting for condition'));
  });
});
