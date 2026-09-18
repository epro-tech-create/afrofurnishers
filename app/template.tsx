'use client';
import { motion, useReducedMotion } from 'motion/react';
export default function Template({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  return <motion.div initial={false} animate={reduced ? {} : { opacity: [0.5, 1], y: [10, 0] }} transition={{ duration: 0.4 }}>{children}</motion.div>;
}
