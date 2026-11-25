"use client";

import { motion, useReducedMotion } from "motion/react";

/** Gentle page transition inside the platform (re-mounts on every navigation). */
export default function PlatformTemplate({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}>
      {children}
    </motion.div>
  );
}
