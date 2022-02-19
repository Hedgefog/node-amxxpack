export default function accumulator() {
  let value = '';

  return (data?: string) => {
    value += (data || '');
    return value;
  };
}
