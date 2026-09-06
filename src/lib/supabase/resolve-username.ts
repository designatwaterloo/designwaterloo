import { cache } from 'react';
import { createClient } from './server';
// Request-scoped only: visibility depends on the signed-in viewer.
export const resolveUsername = cache(async (username: string) => {
  const client = await createClient();
  const { data, error } = await client.rpc('resolve_username', { requested_username: username });
  if (error) throw new Error('Could not load this profile. Please try again.');
  return data;
});
