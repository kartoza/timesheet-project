export function formatManagerName(name: string): string {
  const cleaned = name.replace('@kartoza.com', '');
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}
