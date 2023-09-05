let retryDelayMillis = 10000;
let defaultTimeoutMillis = 900000; // Default timeout is 15m.

const timer = (ms) => new Promise((res) => {
  setTimeout(res, ms);
});

const setRetryDelay = (delayMillis, timeoutMillis) => {
  retryDelayMillis = delayMillis;
  defaultTimeoutMillis = timeoutMillis;
};

/**
 * Wait until a condition is successful or the timout is reached.
 * @param queryFn the async function that returns the output to verify
 * @param checkFn a function to check the output from queryFn. If the function returns true,
 *                the retry loop will exit
 * @param timeoutMillis the maximum wait time in milliseconds or -1 to use the default timeout
 * @returns {Promise<any>} a promise that completes with the last output from queryFn
 */
const retryUntil = async (queryFn, checkFn, timeoutMillis) => {
  const t0 = Date.now();
  let output = '';

  const timeout = timeoutMillis > 0 ? timeoutMillis : defaultTimeoutMillis;
  do {
    if (Date.now() - t0 > timeout) {
      throw new Error('Timed out waiting for condition');
    }
    // eslint-disable-next-line no-await-in-loop
    output = await timer(retryDelayMillis).then(() => queryFn());
  } while (!checkFn(output));
  return output;
};

module.exports = {
  retryUntil,
  setRetryDelay,
};
