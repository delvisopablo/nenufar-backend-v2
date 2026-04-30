export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function buildSlugCandidate(input: string, suffix = 0): string {
  const baseSlug = slugify(input) || 'negocio';
  return suffix > 0 ? `${baseSlug}-${suffix + 1}` : baseSlug;
}
