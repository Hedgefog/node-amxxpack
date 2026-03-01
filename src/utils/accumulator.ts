function accumulator() {
  let value = '';

  return (data?: string) => {
    value += (data || '');
    return value;
  };
}

export default accumulator;
