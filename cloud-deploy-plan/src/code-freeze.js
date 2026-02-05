const codeFreeze = {
  start: Date.parse('2025-12-18T16:00:00Z'),
  end: Date.parse('2026-01-04T23:59:59Z'),
};

const isCodeFreeze = (epochMillis) => {
  return epochMillis >= codeFreeze.start && epochMillis <= codeFreeze.end;
};

const getFreezeEnd = () => new Date(codeFreeze.end);

export { getFreezeEnd, isCodeFreeze };
