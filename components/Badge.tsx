export function Badge({ valor }: { valor: string }) {
  const cls = `badge badge-${valor.toLowerCase()}`;
  return <span className={cls}>{valor}</span>;
}