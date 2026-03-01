function stringAccumulator() {
  let value = '';

  return (data?: string | Buffer) => {
    value += (data?.toString() || '');
    return value;
  };
}

export default stringAccumulator;
