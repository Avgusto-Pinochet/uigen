"use client";

import { Loader2, FilePlus, FileEdit, FileSearch, FileX, FolderInput } from "lucide-react";

interface ToolInvocationBadgeProps {
  toolName: string;
  args: Record<string, unknown>;
  state: "call" | "result" | "partial-call";
}

type IconComponent = React.ComponentType<{ className?: string }>;

interface ToolInfo {
  label: string;
  filename: string;
  Icon: IconComponent;
}

function getFilename(path: unknown): string {
  if (typeof path !== "string") return "";
  return path.split("/").pop() ?? path;
}

function getToolInfo(toolName: string, args: Record<string, unknown>): ToolInfo {
  if (toolName === "str_replace_editor") {
    const command = args.command as string;
    const filename = getFilename(args.path);
    switch (command) {
      case "create":
        return { label: "Creating", filename, Icon: FilePlus };
      case "str_replace":
      case "insert":
        return { label: "Editing", filename, Icon: FileEdit };
      case "view":
        return { label: "Reading", filename, Icon: FileSearch };
      case "undo_edit":
        return { label: "Reverting", filename, Icon: FileEdit };
    }
  }

  if (toolName === "file_manager") {
    const command = args.command as string;
    const filename = getFilename(args.path);
    switch (command) {
      case "rename":
        return { label: "Renaming", filename, Icon: FolderInput };
      case "delete":
        return { label: "Deleting", filename, Icon: FileX };
    }
  }

  return { label: toolName, filename: "", Icon: FileEdit };
}

export function ToolInvocationBadge({ toolName, args, state }: ToolInvocationBadgeProps) {
  const { label, filename, Icon } = getToolInfo(toolName, args);
  const isDone = state === "result";

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs border border-neutral-200">
      <Icon className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
      <span className="text-neutral-600">{label}</span>
      {filename && (
        <span className="font-mono text-neutral-800 bg-neutral-100 px-1.5 py-0.5 rounded">
          {filename}
        </span>
      )}
      <div className="ml-1">
        {isDone ? (
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
        ) : (
          <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
        )}
      </div>
    </div>
  );
}
