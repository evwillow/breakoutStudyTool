import { useCallback, useState } from "react";

export const useFolderNavigation = (onExpand?: (() => void) | null) => {
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  const isExpanded = useCallback(
    (id: string) => expandedIds.includes(id),
    [expandedIds]
  );

  const toggle = useCallback(
    (id: string, shouldExpand: boolean) => {
      setExpandedIds(prev => {
        if (shouldExpand) {
          if (prev.includes(id)) return prev;
          return [...prev, id];
        }
        return prev.filter(item => item !== id);
      });

      if (shouldExpand && onExpand) {
        onExpand();
      }
    },
    [onExpand]
  );

  return { expandedIds, toggle, isExpanded };
};

