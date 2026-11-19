/** Un texte qui ressemble à du code s'affiche en police à chasse fixe. */
export function looksLikeCode(text: string): boolean {
  return /=>|[{}]|\w\(.*\)|<\/?[a-z]+[ >]|^\s*(def|import|from|const|let|SELECT)\b|\b[a-z_]+\.[a-z_]+\(/i.test(text);
}
