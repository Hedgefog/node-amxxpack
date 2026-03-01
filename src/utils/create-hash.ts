import crypto from 'crypto';

export default function createHash(data: string | Buffer): string {
  const hashSum = crypto.createHash('sha256');
  hashSum.update(data);

  return hashSum.digest('hex');
}
