"use client";

import * as React from "react";
import { BookA, BookOpen, ExternalLink, FolderPlus, Headphones, Mic, PenLine, Search, SpellCheck2, type LucideIcon } from "lucide-react";
import { library, type Resource } from "@/lib/content";
import { cn } from "@/lib/utils";
import { PageHeader, EmptyState } from "@/components/shared/page";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/section";
import { Input } from "@/components/ui/input";

const ICONS: Record<string, LucideIcon> = {
  grammar: SpellCheck2,
  vocabulary: BookA,
  reading: BookOpen,
  listening: Headphones,
  writing: PenLine,
  speaking: Mic,
};

const EXAMPLE = `{
  "id": "res-grammar-notes-1",
  "category": "grammar",
  "title": "My notes: tenses overview",
  "author": "Me",
  "level": ["A2", "B1"],
  "format": "notes",
  "rights": "personal-notes",
  "url": "/files/tenses.pdf",
  "tags": ["tenses"]
}`;

export default function LibraryPage() {
  const [cat, setCat] = React.useState<string>("all");
  const [q, setQ] = React.useState("");
  const resources: Resource[] = library.resources;

  const filtered = resources.filter(
    (r) =>
      (cat === "all" || r.category === cat) &&
      (!q.trim() || `${r.title} ${r.author ?? ""} ${r.tags.join(" ")}`.toLowerCase().includes(q.trim().toLowerCase())),
  );

  return (
    <div className="space-y-8">
      <PageHeader title="Library" description="Your educational materials, organised by skill. Ready to receive textbooks, notes, audio and metadata." />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {library.categories.map((c) => {
          const Icon = ICONS[c.id] ?? BookOpen;
          const count = resources.filter((r) => r.category === c.id).length;
          const active = cat === c.id;
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={active}
              onClick={() => setCat(active ? "all" : c.id)}
              className={cn(
                "group flex cursor-pointer flex-col gap-3 rounded-lg border p-4 text-left transition-colors",
                active ? "border-accent-line bg-accent-muted" : "border-line bg-card hover:border-line-strong",
              )}
            >
              <div className="flex items-center justify-between">
                <Icon className={cn("size-[18px]", active ? "text-accent-soft" : "text-muted")} />
                <span className="tabular text-[12px] text-subtle">{count}</span>
              </div>
              <div>
                <div className="text-[14px] font-medium">{c.title}</div>
                <div className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-subtle">{c.description}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search titles, authors, tags" className="pl-9" aria-label="Search library" />
      </div>

      {filtered.length ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <Card key={r.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">{r.format}</Badge>
                  {r.level.map((l) => <Badge key={l}>{l}</Badge>)}
                </div>
                <div className="text-[14px] font-medium">{r.title}</div>
                {r.author && <div className="text-[12px] text-subtle">{r.author}</div>}
                {r.description && <p className="text-[13px] text-muted">{r.description}</p>}
                {r.url && (
                  <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12.5px] text-accent-soft hover:text-fg">
                    Open <ExternalLink className="size-3" />
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.1fr]">
          <EmptyState
            icon={FolderPlus}
            title={resources.length ? "No resources match" : "Your library is empty"}
            description={
              resources.length
                ? "Try another category or search term."
                : "Materials you add will appear here, grouped by skill and level. Nothing has been downloaded or scraped — the library only holds what you provide."
            }
            className="h-full"
          />
          <Card>
            <CardHeader>
              <CardTitle>How to add materials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-[13px] leading-relaxed text-muted">
              <ol className="list-decimal space-y-1.5 pl-4">
                <li>Add an entry to <code className="font-mono text-fg/80">content/library/resources.json</code>.</li>
                <li>Put files you have the rights to use in <code className="font-mono text-fg/80">public/files/</code> (local) or Supabase Storage.</li>
                <li>Set <code className="font-mono text-fg/80">rights</code> so it’s clear how each item may be used.</li>
              </ol>
              <pre className="overflow-x-auto rounded-md border border-line bg-surface p-3 font-mono text-[11.5px] leading-relaxed text-fg/80">{EXAMPLE}</pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
