import { useEffect, useRef } from "react";

/**
 * Auto-scrolls a container to bottom when `dependency` changes.
 */
export function useAutoScroll(dependency: any) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [dependency]);

  return ref;
}
