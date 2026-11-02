export function SearchHighlight({ text, query }: { text: string; query: string }) {
  const term = query.trim();
  if (!term) return text;

  const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escapedTerm})`, "gi"));

  return parts.map((part, index) => part.toLowerCase() === term.toLowerCase()
    ? <mark className="search-highlight" key={index}>{part}</mark>
    : part);
}
