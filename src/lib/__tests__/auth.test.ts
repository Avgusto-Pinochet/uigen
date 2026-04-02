// @vitest-environment node
import { test, expect, vi, beforeEach, describe } from "vitest";

// Mock server-only so it doesn't throw in test environment
vi.mock("server-only", () => ({}));

// Mock next/headers cookies
const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

// Mock next/server (needed for module resolution)
vi.mock("next/server", () => ({
  NextRequest: class NextRequest {
    cookies = { get: vi.fn() };
  },
}));

// Import after mocks are set up
const { createSession, getSession, deleteSession, verifySession } =
  await import("@/lib/auth");

beforeEach(() => {
  vi.clearAllMocks();
  // Reset env
  delete process.env.JWT_SECRET;
});

describe("createSession", () => {
  test("sets an httpOnly cookie with a JWT token", async () => {
    await createSession("user-123", "test@example.com");

    expect(mockCookieStore.set).toHaveBeenCalledOnce();
    const [name, token, options] = mockCookieStore.set.mock.calls[0];
    expect(name).toBe("auth-token");
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3); // valid JWT structure
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
  });

  test("sets cookie expiry ~7 days from now", async () => {
    const before = Date.now();
    await createSession("user-123", "test@example.com");
    const after = Date.now();

    const [, , options] = mockCookieStore.set.mock.calls[0];
    const expiresAt: Date = options.expires;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
  });
});

describe("getSession", () => {
  test("returns null when no cookie is present", async () => {
    mockCookieStore.get.mockReturnValue(undefined);

    const session = await getSession();
    expect(session).toBeNull();
  });

  test("returns null for an invalid/malformed token", async () => {
    mockCookieStore.get.mockReturnValue({ value: "not.a.valid.jwt" });

    const session = await getSession();
    expect(session).toBeNull();
  });

  test("returns session payload for a valid token created by createSession", async () => {
    // Capture the token written by createSession
    let capturedToken = "";
    mockCookieStore.set.mockImplementation((_name: string, token: string) => {
      capturedToken = token;
    });

    await createSession("user-abc", "hello@example.com");

    // Now make getSession read that token back
    mockCookieStore.get.mockReturnValue({ value: capturedToken });

    const session = await getSession();
    expect(session).not.toBeNull();
    expect(session?.userId).toBe("user-abc");
    expect(session?.email).toBe("hello@example.com");
  });
});

describe("deleteSession", () => {
  test("deletes the auth-token cookie", async () => {
    await deleteSession();

    expect(mockCookieStore.delete).toHaveBeenCalledWith("auth-token");
  });
});

describe("verifySession", () => {
  test("returns null when request has no auth-token cookie", async () => {
    const { NextRequest } = await import("next/server");
    const req = new NextRequest() as any;
    req.cookies.get = vi.fn().mockReturnValue(undefined);

    const session = await verifySession(req);
    expect(session).toBeNull();
  });

  test("returns null for an invalid token in request", async () => {
    const { NextRequest } = await import("next/server");
    const req = new NextRequest() as any;
    req.cookies.get = vi.fn().mockReturnValue({ value: "bad.token.here" });

    const session = await verifySession(req);
    expect(session).toBeNull();
  });

  test("returns session payload for a valid token in request", async () => {
    // Capture token from createSession
    let capturedToken = "";
    mockCookieStore.set.mockImplementation((_name: string, token: string) => {
      capturedToken = token;
    });
    await createSession("user-xyz", "verify@example.com");

    const { NextRequest } = await import("next/server");
    const req = new NextRequest() as any;
    req.cookies.get = vi.fn().mockReturnValue({ value: capturedToken });

    const session = await verifySession(req);
    expect(session).not.toBeNull();
    expect(session?.userId).toBe("user-xyz");
    expect(session?.email).toBe("verify@example.com");
  });
});
