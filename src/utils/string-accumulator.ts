function stringAccumulator() {
  let value = '';

  return (data?: unknown) => {
    value += (data?.toString() || '');
    return value;
  };
}

export default stringAccumulator;
