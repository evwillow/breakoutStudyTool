import React from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  hint?: string | null;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, hint }) => (
  <div className="text-center py-8 px-4 bg-black/40 backdrop-blur border border-white/20 rounded-lg">
    <p className="text-white/85 text-base font-medium">{title}</p>
    {description && <p className="text-white/60 text-sm mt-2">{description}</p>}
    {hint && <p className="text-white/40 text-xs mt-3">{hint}</p>}
  </div>
);

