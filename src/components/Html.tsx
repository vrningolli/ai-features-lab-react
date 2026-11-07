/**
 * Renders trusted authored HTML from the curriculum content.
 * Content is authored in-repo (not user input), so dangerouslySetInnerHTML
 * is acceptable here. If content ever becomes user-supplied, sanitize first.
 */
export function Html({ html, as: Tag = "div", className }: { html: string; as?: keyof JSX.IntrinsicElements; className?: string }) {
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** A <ul class="clean"> (or custom class) whose items are trusted HTML. */
export function HtmlList({ items, className = "clean" }: { items: string[]; className?: string }) {
  return (
    <ul className={className}>
      {items.map((item, i) => (
        <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
      ))}
    </ul>
  );
}
