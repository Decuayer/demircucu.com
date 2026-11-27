/**
 * The hero shows "<greeting> <name>". The settings field is meant to hold the name only; when it
 * starts with the greeting itself (e.g. "Merhaba, ben Örnek"), the greeting is not repeated.
 */
export function stripGreeting(title: string, greeting: string, locale: string): string {
  const normalize = (value: string) =>
    value
      .toLocaleLowerCase(locale)
      .replace(/[\s,.!:;'’"-]+/g, " ")
      .trim();
  const words = title.trim().split(/\s+/);
  const target = normalize(greeting);
  for (let i = words.length; i > 0; i--) {
    if (normalize(words.slice(0, i).join(" ")) === target) {
      return words.slice(i).join(" ").trim();
    }
  }
  return title.trim();
}
