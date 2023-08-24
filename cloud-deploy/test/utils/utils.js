const mockOutput = (data, opts) => {
  if (opts && opts.listeners) {
    opts.listeners.stdout(Buffer.from(`${data}\n`, 'utf8'));
  }
  return Promise.resolve(0);
};

module.exports = {
  mockOutput,
};
