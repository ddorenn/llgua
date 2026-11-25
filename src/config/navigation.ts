import {
  BarChart3, BookA, BookOpen, CalendarCheck, ClipboardList, Headphones, LayoutDashboard, Library,
  Mic, NotebookPen, PenLine, Route, Settings, Sparkles, type LucideIcon,
} from "lucide-react";
import type { Dictionary } from "@/lib/i18n";

export type NavKey = keyof Dictionary["nav"];

export interface NavItem {
  href: string;
  key: NavKey;
  icon: LucideIcon;
}

export interface NavSection {
  key: NavKey;
  items: NavItem[];
}

export const NAVIGATION: NavSection[] = [
  {
    key: "section_main",
    items: [
      { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
      { href: "/learning", key: "learning", icon: Route },
      { href: "/daily-plan", key: "dailyPlan", icon: CalendarCheck },
      { href: "/tutor", key: "tutor", icon: Sparkles },
      { href: "/homework", key: "homework", icon: NotebookPen },
    ],
  },
  {
    key: "section_practice",
    items: [
      { href: "/vocabulary", key: "vocabulary", icon: BookA },
      { href: "/practice/reading", key: "reading", icon: BookOpen },
      { href: "/practice/listening", key: "listening", icon: Headphones },
      { href: "/practice/speaking", key: "speaking", icon: Mic },
      { href: "/practice/writing", key: "writing", icon: PenLine },
    ],
  },
  {
    key: "section_track",
    items: [
      { href: "/progress", key: "progress", icon: BarChart3 },
      { href: "/assessments", key: "assessments", icon: ClipboardList },
      { href: "/library", key: "library", icon: Library },
    ],
  },
];

export const SETTINGS_NAV: NavItem = { href: "/settings", key: "settings", icon: Settings };

/** Primary destinations for the mobile bottom bar. */
export const MOBILE_TABS: NavItem[] = [
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/daily-plan", key: "dailyPlan", icon: CalendarCheck },
  { href: "/tutor", key: "tutor", icon: Sparkles },
  { href: "/vocabulary", key: "vocabulary", icon: BookA },
];
