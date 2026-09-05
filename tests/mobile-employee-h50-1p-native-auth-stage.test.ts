import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("H50.1P native authentication stage diagnostics", () => {
  it("defines bounded, user-visible stage codes without secret payloads", () => {
    const diagnostic = read("mobile/src/auth/diagnostic.ts");

    expect(diagnostic).toContain("NativeAuthStageError");
    expect(diagnostic).toContain("firebase_native");
    expect(diagnostic).toContain("app_check");
    expect(diagnostic).toContain("firebase_auth");
    expect(diagnostic).toContain("secure_session");
    expect(diagnostic).toContain("opsiqo_api");
    expect(diagnostic).not.toContain("console.log");
    expect(diagnostic).not.toContain("console.warn");
  });

  it("separates Firebase native initialization from App Check token acquisition", () => {
    const appCheck = read("mobile/src/security/app-check.ts");

    expect(appCheck).toContain("PULSE-AUTH-A01");
    expect(appCheck).toContain("PULSE-AUTH-A02");
    expect(appCheck).toMatch(/provider:\s*["']appAttest["']/);
    expect(appCheck).toMatch(/provider:\s*["']playIntegrity["']/);
    expect(appCheck).toContain("await wait(350)");
    expect(appCheck).not.toContain("error.message");
    expect(appCheck).not.toContain("JSON.stringify(error");
  });

  it("classifies Firebase Auth, session storage and OPSIQO API boundaries", () => {
    const session = read("mobile/src/auth/session.ts");
    const provider = read("mobile/src/auth/provider.tsx");

    expect(session).toContain("PULSE-AUTH-A03");
    expect(session).toContain("PULSE-AUTH-A04-CREDENTIALS");
    expect(session).toContain("PULSE-AUTH-A04-APPCHECK");
    expect(session).toContain("PULSE-AUTH-A05");
    expect(provider).toContain("PULSE-AUTH-A06-");
    expect(provider).toContain("PULSE-AUTH-A06-NOORG");
  });

  it("does not emit credentials, Firebase tokens, App Check tokens, email or UID", () => {
    const sources = [
      read("mobile/src/auth/diagnostic.ts"),
      read("mobile/src/security/app-check.ts"),
      read("mobile/src/auth/session.ts"),
      read("mobile/src/auth/provider.tsx"),
    ].join("\n");

    expect(sources).not.toContain("console.log");
    expect(sources).not.toContain("console.warn");
    expect(sources).not.toContain("tokenPreview");
    expect(sources).not.toContain("passwordPreview");
    expect(sources).not.toContain("decoded.uid");
    expect(sources).not.toContain("decoded.email");
  });

  it("preserves the 0.1.5 H50.1O native build target", () => {
    const app = JSON.parse(read("mobile/app.json"));

    expect(app.expo.version).toBe("0.1.5");
    expect(app.expo.icon).toBe("./assets/opsiqo-pulse-3d-icon.png");
    expect(app.expo.ios.icon).toBe("./assets/opsiqo-pulse-3d-icon.png");
  });
});