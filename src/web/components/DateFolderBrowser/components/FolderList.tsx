import React from "react";
import type { PreviousSetupFile, FileDataMap } from "../DateFolderBrowser.types";
import { FolderItem } from "./FolderItem";

interface FolderListProps {
  files: PreviousSetupFile[];
  expandedIds: string[];
  onToggle: (fileId: string) => void;
  loadingId: string | null;
  fileData: FileDataMap;
  currentBreakoutDate: Date | null;
}

export const FolderList: React.FC<FolderListProps> = ({
  files,
  expandedIds,
  onToggle,
  loadingId,
  fileData,
  currentBreakoutDate
}) => (
  <div className="space-y-4">
    {files.map(file => (
      <FolderItem
        key={file.id}
        file={file}
        isExpanded={expandedIds.includes(file.id)}
        onToggle={() => onToggle(file.id)}
        isLoading={loadingId === file.id && !fileData[file.id]}
        data={fileData[file.id] ?? null}
        currentBreakoutDate={currentBreakoutDate}
      />
    ))}
  </div>
);

