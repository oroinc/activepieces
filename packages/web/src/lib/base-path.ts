function resolveBasePath(): string {
  const href = document.querySelector('base')?.getAttribute('href');
  if (!href) return '/';
  return href.endsWith('/') ? href : `${href}/`;
}

export const basePath: string = resolveBasePath();
