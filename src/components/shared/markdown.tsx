import * as React from "react";

/**
 * Small, safe Markdown renderer for AI replies (no HTML injection — React text only).
 * Supports: headings (#..###), paragraphs, bullet & numbered lists, **bold**, *italic*, `code`,
 * fenced code blocks, horizontal rules and simple pipe tables.
 */
const INLINE =
  /~~(.+?)~~|`([^`]+)`|\*\*(.+?)\*\*|\*((?:\*\*.+?\*\*|[^*\s])(?:\*\*.+?\*\*|[^*])*?)\*(?!\*)|(?<![\w])_([^_\n]+?)_(?![\w])/;

/** Recursive inline parser: `code`, **bold**, *italic* (may contain **bold**), _italic_. */
function inline(text: string, key: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let rest = text;
  let i = 0;
  while (rest) {
    const m = INLINE.exec(rest);
    if (!m) {
      out.push(<React.Fragment key={`${key}-${i++}`}>{rest}</React.Fragment>);
      break;
    }
    if (m.index > 0) out.push(<React.Fragment key={`${key}-${i++}`}>{rest.slice(0, m.index)}</React.Fragment>);
    const k = `${key}-${i++}`;
    if (m[1] !== undefined)
      out.push(<del key={k} className="text-muted decoration-accent decoration-2">{m[1]}</del>);
    else if (m[2] !== undefined)
      out.push(<code key={k} className="rounded bg-elevated px-1 py-0.5 font-mono text-[0.9em] text-accent-soft">{m[2]}</code>);
    else if (m[3] !== undefined) out.push(<strong key={k} className="font-semibold text-fg">{inline(m[3], k)}</strong>);
    else out.push(<em key={k} className="lang">{inline(m[4] ?? m[5], k)}</em>);
    rest = rest.slice(m.index + m[0].length);
  }
  return out;
}

function isTableSep(line: string) {
  return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);
}

function cells(line: string) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
}

export function Markdown({ text, className }: { text: string; className?: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out: React.ReactNode[] = [];
  let i = 0;
  let n = 0;

  while (i < lines.length) {
    const line = lines[i];
    const key = `b${n++}`;

    if (!line.trim()) { i++; continue; }

    if (line.trim().startsWith("```")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) code.push(lines[i++]);
      i++;
      out.push(<pre key={key} className="overflow-x-auto rounded-md border border-line bg-surface p-3 font-mono text-[12.5px] leading-relaxed">{code.join("\n")}</pre>);
      continue;
    }

    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      out.push(<p key={key} className="mt-1 font-semibold text-fg">{inline(h[2], key)}</p>);
      i++;
      continue;
    }

    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) { out.push(<hr key={key} className="border-line" />); i++; continue; }

    if (line.includes("|") && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const head = cells(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) rows.push(cells(lines[i++]));
      out.push(
        <div key={key} className="overflow-x-auto rounded-md border border-line">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-surface text-muted">
              <tr>{head.map((c, j) => <th key={j} className="px-3 py-2 font-medium">{inline(c, `${key}h${j}`)}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r, ri) => (
                <tr key={ri}>{r.map((c, j) => <td key={j} className="px-3 py-2 align-top">{inline(c, `${key}r${ri}${j}`)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (/^\s*[-*•]\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const items: string[] = [];
      while (i < lines.length && (ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-*•]\s+/).test(lines[i])) {
        items.push(lines[i].replace(ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-*•]\s+/, ""));
        i++;
      }
      const ListTag = ordered ? "ol" : "ul";
      out.push(
        <ListTag key={key} className={ordered ? "list-decimal space-y-1 pl-5" : "list-disc space-y-1 pl-5 marker:text-accent-soft"}>
          {items.map((it, j) => <li key={j}>{inline(it, `${key}-${j}`)}</li>)}
        </ListTag>,
      );
      continue;
    }

    const para: string[] = [];
    while (
      i < lines.length && lines[i].trim() &&
      !/^(#{1,4})\s+/.test(lines[i]) && !/^\s*([-*•]|\d+[.)])\s+/.test(lines[i]) && !lines[i].trim().startsWith("```")
    ) para.push(lines[i++]);
    out.push(
      <p key={key}>
        {para.map((pl, j) => (
          <React.Fragment key={j}>
            {j > 0 && <br />}
            {inline(pl, `${key}-${j}`)}
          </React.Fragment>
        ))}
      </p>,
    );
  }

  return <div className={className ?? "space-y-2.5"}>{out}</div>;
}
