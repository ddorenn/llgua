import * as React from "react";

/**
 * Minimal, safe rich text for content files: paragraphs (blank line),
 * **bold** and *italic*. No HTML injection — everything is rendered as React text.
 */
function inline(text: string, keyBase: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={`${keyBase}-${i}`} className="font-semibold text-fg">{p.slice(2, -2)}</strong>;
    if (p.startsWith("*") && p.endsWith("*")) return <em key={`${keyBase}-${i}`} className="text-accent-soft not-italic">{p.slice(1, -1)}</em>;
    return <React.Fragment key={`${keyBase}-${i}`}>{p}</React.Fragment>;
  });
}

export function RichText({ text, className }: { text: string; className?: string }) {
  return (
    <div className={className}>
      {text.split(/\n{2,}/).map((para, i) => (
        <p key={i} className="mb-3 last:mb-0">
          {inline(para, String(i))}
        </p>
      ))}
    </div>
  );
}
