
const sortAndCompare = (array, docPath, result) => {
  const sorted = array.slice(0).sort((a, b) => a.localeCompare(b, 'en-US'));
  for (let i = 0; i < array.length; i += 1) {
    if (array[i] !== sorted[i]) {
      const err = result.addError('is not sorted alphabetically');
      err.property = `instance.${docPath}[${i}]`;
    }
  }
};


module.exports = sortAndCompare;
