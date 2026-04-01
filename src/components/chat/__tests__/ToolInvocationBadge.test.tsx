import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocationBadge } from "../ToolInvocationBadge";

afterEach(() => {
  cleanup();
});

// str_replace_editor commands

test("shows 'Creating' label with filename for str_replace_editor create command", () => {
  render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/src/components/Button.tsx" }}
      state="call"
    />
  );

  expect(screen.getByText("Creating")).toBeDefined();
  expect(screen.getByText("Button.tsx")).toBeDefined();
});

test("shows 'Editing' label for str_replace_editor str_replace command", () => {
  render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "str_replace", path: "/src/App.tsx" }}
      state="call"
    />
  );

  expect(screen.getByText("Editing")).toBeDefined();
  expect(screen.getByText("App.tsx")).toBeDefined();
});

test("shows 'Editing' label for str_replace_editor insert command", () => {
  render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "insert", path: "/src/index.ts" }}
      state="result"
    />
  );

  expect(screen.getByText("Editing")).toBeDefined();
  expect(screen.getByText("index.ts")).toBeDefined();
});

test("shows 'Reading' label for str_replace_editor view command", () => {
  render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "view", path: "/src/utils.ts" }}
      state="result"
    />
  );

  expect(screen.getByText("Reading")).toBeDefined();
  expect(screen.getByText("utils.ts")).toBeDefined();
});

test("shows 'Reverting' label for str_replace_editor undo_edit command", () => {
  render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "undo_edit", path: "/src/styles.css" }}
      state="call"
    />
  );

  expect(screen.getByText("Reverting")).toBeDefined();
  expect(screen.getByText("styles.css")).toBeDefined();
});

// file_manager commands

test("shows 'Renaming' label for file_manager rename command", () => {
  render(
    <ToolInvocationBadge
      toolName="file_manager"
      args={{ command: "rename", path: "/src/old.tsx", new_path: "/src/new.tsx" }}
      state="call"
    />
  );

  expect(screen.getByText("Renaming")).toBeDefined();
  expect(screen.getByText("old.tsx")).toBeDefined();
});

test("shows 'Deleting' label for file_manager delete command", () => {
  render(
    <ToolInvocationBadge
      toolName="file_manager"
      args={{ command: "delete", path: "/src/unused.tsx" }}
      state="result"
    />
  );

  expect(screen.getByText("Deleting")).toBeDefined();
  expect(screen.getByText("unused.tsx")).toBeDefined();
});

// State indicators

test("shows green dot when state is result", () => {
  const { container } = render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/src/Done.tsx" }}
      state="result"
    />
  );

  const dot = container.querySelector(".bg-emerald-500");
  expect(dot).toBeDefined();
});

test("shows spinner when state is call", () => {
  const { container } = render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/src/InProgress.tsx" }}
      state="call"
    />
  );

  const spinner = container.querySelector(".animate-spin");
  expect(spinner).toBeDefined();
});

test("shows spinner when state is partial-call", () => {
  const { container } = render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "str_replace", path: "/src/Partial.tsx" }}
      state="partial-call"
    />
  );

  const spinner = container.querySelector(".animate-spin");
  expect(spinner).toBeDefined();
});

// Unknown tool fallback

test("shows tool name as label for unknown tools", () => {
  render(
    <ToolInvocationBadge
      toolName="unknown_tool"
      args={{}}
      state="result"
    />
  );

  expect(screen.getByText("unknown_tool")).toBeDefined();
});

// Filename extraction

test("extracts filename from nested path", () => {
  render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "view", path: "/very/deep/nested/path/Component.tsx" }}
      state="result"
    />
  );

  expect(screen.getByText("Component.tsx")).toBeDefined();
});
