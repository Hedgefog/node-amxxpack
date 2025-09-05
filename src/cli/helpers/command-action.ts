import handleError from './handle-error';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function commandAction<T>(fn: (...args: any[]) => void | Promise<void>) {
  return async (...args: T[]) => {
    try {
      await fn(...args);
    } catch (err) {
      handleError(err);
    }
  };
}
