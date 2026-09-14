import { readFile } from 'node:fs/promises';
import { notFound } from 'next/navigation';
import type { ComponentProps } from 'react';
import ProfileContent from '@/app/directory/[slug]/ProfileContent';

export const dynamic = 'force-dynamic';
export default async function LocalProfilePreview() {
  if (process.env.NODE_ENV !== 'development') notFound();
  let props: ComponentProps<typeof ProfileContent>;
  try {
    props = JSON.parse(await readFile(`${process.cwd()}/.local-profile-preview.json`, 'utf8'));
  } catch {
    props = JSON.parse(await readFile(`${process.cwd()}/tests/fixtures/profile-preview.json`, 'utf8'));
  }
  return <main><ProfileContent {...props} /></main>;
}
