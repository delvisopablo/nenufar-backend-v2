import { slugify } from '../common/slug/slugify';

type NegocioSlugClient = {
  negocio: {
    findUnique(args: { where: { slug: string } }): Promise<{ id: number } | null>;
  };
};

export function slugifyNegocioNombre(value: string): string {
  return slugify(value);
}

export async function generateUniqueNegocioSlug(
  client: NegocioSlugClient,
  nombre: string,
): Promise<string> {
  const baseSlug = slugifyNegocioNombre(nombre);
  let slug = baseSlug;
  let suffix = 2;

  while (await client.negocio.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
}
