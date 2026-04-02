import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "../use-auth";

// --- Mocks ---

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

// Typed imports for mock control
import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

const mockSignIn = vi.mocked(signInAction);
const mockSignUp = vi.mocked(signUpAction);
const mockGetAnonWorkData = vi.mocked(getAnonWorkData);
const mockClearAnonWork = vi.mocked(clearAnonWork);
const mockGetProjects = vi.mocked(getProjects);
const mockCreateProject = vi.mocked(createProject);

// ---

beforeEach(() => {
  vi.clearAllMocks();
  // Default: no anon work, no projects, createProject returns a new id
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockResolvedValue([]);
  mockCreateProject.mockResolvedValue({ id: "new-project-id" } as any);
});

describe("useAuth — initial state", () => {
  test("isLoading starts as false", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(false);
  });

  test("exposes signIn and signUp functions", () => {
    const { result } = renderHook(() => useAuth());
    expect(typeof result.current.signIn).toBe("function");
    expect(typeof result.current.signUp).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// signIn
// ---------------------------------------------------------------------------

describe("signIn — happy path", () => {
  test("calls signInAction with provided credentials", async () => {
    mockSignIn.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    expect(mockSignIn).toHaveBeenCalledWith("user@example.com", "password123");
  });

  test("returns the result from signInAction", async () => {
    mockSignIn.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAuth());
    let returned: any;
    await act(async () => {
      returned = await result.current.signIn("user@example.com", "password123");
    });

    expect(returned).toEqual({ success: true });
  });

  test("sets isLoading true while in flight and false after", async () => {
    let resolveSignIn!: (v: any) => void;
    mockSignIn.mockReturnValue(new Promise((res) => (resolveSignIn = res)));

    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.signIn("user@example.com", "password123");
    });
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveSignIn({ success: true });
    });
    expect(result.current.isLoading).toBe(false);
  });
});

describe("signIn — failure path", () => {
  test("returns error result and does not navigate", async () => {
    mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });

    const { result } = renderHook(() => useAuth());
    let returned: any;
    await act(async () => {
      returned = await result.current.signIn("bad@example.com", "wrongpass");
    });

    expect(returned).toEqual({ success: false, error: "Invalid credentials" });
    expect(mockPush).not.toHaveBeenCalled();
  });

  test("sets isLoading false even when signInAction fails", async () => {
    mockSignIn.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("user@example.com", "password123").catch(() => {});
    });

    expect(result.current.isLoading).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// signUp
// ---------------------------------------------------------------------------

describe("signUp — happy path", () => {
  test("calls signUpAction with provided credentials", async () => {
    mockSignUp.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signUp("new@example.com", "securepass");
    });

    expect(mockSignUp).toHaveBeenCalledWith("new@example.com", "securepass");
  });

  test("returns the result from signUpAction", async () => {
    mockSignUp.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAuth());
    let returned: any;
    await act(async () => {
      returned = await result.current.signUp("new@example.com", "securepass");
    });

    expect(returned).toEqual({ success: true });
  });

  test("sets isLoading true while in flight and false after", async () => {
    let resolveSignUp!: (v: any) => void;
    mockSignUp.mockReturnValue(new Promise((res) => (resolveSignUp = res)));

    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.signUp("new@example.com", "securepass");
    });
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveSignUp({ success: true });
    });
    expect(result.current.isLoading).toBe(false);
  });
});

describe("signUp — failure path", () => {
  test("returns error result and does not navigate", async () => {
    mockSignUp.mockResolvedValue({ success: false, error: "Email already registered" });

    const { result } = renderHook(() => useAuth());
    let returned: any;
    await act(async () => {
      returned = await result.current.signUp("taken@example.com", "securepass");
    });

    expect(returned).toEqual({ success: false, error: "Email already registered" });
    expect(mockPush).not.toHaveBeenCalled();
  });

  test("sets isLoading false even when signUpAction throws", async () => {
    mockSignUp.mockRejectedValue(new Error("Server error"));

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signUp("new@example.com", "securepass").catch(() => {});
    });

    expect(result.current.isLoading).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Post sign-in navigation — anon work present
// ---------------------------------------------------------------------------

describe("handlePostSignIn — anon work with messages", () => {
  const anonWork = {
    messages: [{ role: "user", content: "make a button" }],
    fileSystemData: { "/": { type: "directory" } },
  };

  beforeEach(() => {
    mockSignIn.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue(anonWork);
    mockCreateProject.mockResolvedValue({ id: "anon-project-id" } as any);
  });

  test("creates a project with anon messages and file system data", async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    expect(mockCreateProject).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: anonWork.messages,
        data: anonWork.fileSystemData,
      })
    );
  });

  test("clears anon work after creating project", async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    expect(mockClearAnonWork).toHaveBeenCalledOnce();
  });

  test("navigates to the newly created project", async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    expect(mockPush).toHaveBeenCalledWith("/anon-project-id");
  });

  test("does not call getProjects when anon work exists", async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    expect(mockGetProjects).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Post sign-in navigation — anon work present but no messages
// ---------------------------------------------------------------------------

describe("handlePostSignIn — anon work with empty messages", () => {
  beforeEach(() => {
    mockSignIn.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue({
      messages: [],
      fileSystemData: { "/": { type: "directory" } },
    });
  });

  test("falls through to getProjects when anon messages are empty", async () => {
    mockGetProjects.mockResolvedValue([{ id: "existing-project" }] as any);

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    expect(mockGetProjects).toHaveBeenCalledOnce();
    expect(mockPush).toHaveBeenCalledWith("/existing-project");
  });

  test("does not create a project from empty anon work", async () => {
    mockGetProjects.mockResolvedValue([{ id: "existing-project" }] as any);

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    expect(mockCreateProject).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Post sign-in navigation — no anon work, existing projects
// ---------------------------------------------------------------------------

describe("handlePostSignIn — existing projects, no anon work", () => {
  beforeEach(() => {
    mockSignIn.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue(null);
    mockGetProjects.mockResolvedValue([
      { id: "project-1" },
      { id: "project-2" },
    ] as any);
  });

  test("navigates to the most recent project (first in list)", async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    expect(mockPush).toHaveBeenCalledWith("/project-1");
  });

  test("does not create a new project when existing ones are found", async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    expect(mockCreateProject).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Post sign-in navigation — no anon work, no existing projects
// ---------------------------------------------------------------------------

describe("handlePostSignIn — no anon work, no existing projects", () => {
  beforeEach(() => {
    mockSignIn.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue(null);
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ id: "brand-new-id" } as any);
  });

  test("creates a new blank project", async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    expect(mockCreateProject).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [],
        data: {},
      })
    );
  });

  test("navigates to the newly created blank project", async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    expect(mockPush).toHaveBeenCalledWith("/brand-new-id");
  });

  test("creates project with a non-empty name", async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    const [args] = mockCreateProject.mock.calls[0];
    expect(typeof args.name).toBe("string");
    expect(args.name.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// signUp also triggers post-sign-in navigation
// ---------------------------------------------------------------------------

describe("signUp post-sign-in navigation", () => {
  test("navigates after successful signUp — existing projects", async () => {
    mockSignUp.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue(null);
    mockGetProjects.mockResolvedValue([{ id: "signup-project" }] as any);

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signUp("new@example.com", "securepass");
    });

    expect(mockPush).toHaveBeenCalledWith("/signup-project");
  });

  test("does not navigate after failed signUp", async () => {
    mockSignUp.mockResolvedValue({ success: false, error: "Email already registered" });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signUp("taken@example.com", "securepass");
    });

    expect(mockPush).not.toHaveBeenCalled();
  });
});
