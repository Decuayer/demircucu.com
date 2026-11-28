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

/**
 * The name from the hero setting with any of the given greetings removed from its start, in
 * order (the About page drops both the home greeting, "Hi, I'm", and its own, "Hello, I am").
 */
export function stripGreetings(title: string, greetings: string[], locale: string): string {
  return greetings.reduce((name, greeting) => stripGreeting(name, greeting, locale), title.trim());
}

/** Whether stored rich text has visible text (an emptied editor leaves "<p></p>" or &nbsp;). */
export function hasText(html: string | null | undefined): boolean {
  return !!html && html.replace(/<[^>]*>|&nbsp;/g, "").trim() !== "";
}
