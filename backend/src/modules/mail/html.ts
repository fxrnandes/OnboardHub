const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const escapeHtml = (value: string) => value.replaceAll(/[&<>"']/g, (char) => ENTITIES[char]!);
