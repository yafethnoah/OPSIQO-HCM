import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("H50.1Q Android Firebase prebuild configuration", () => {
  it("wires the EAS Android Firebase file variable into Expo android.googleServicesFile", () => {
    const config = read("mobile/app.config.js");

    expect(config).toContain("const googleServicesJson = process.env.GOOGLE_SERVICES_JSON;");
    expect(config).toContain("android:");
    expect(config).toContain("...config.android");
    expect(config).toContain("googleServicesJson");
    expect(config).toContain("{ googleServicesFile: googleServicesJson }");
  });

  it("preserves the certified iOS Firebase file-variable wiring", () => {
    const config = read("mobile/app.config.js");

    expect(config).toContain("const googleServicesPlist = process.env.GOOGLE_SERVICES_PLIST;");
    expect(config).toContain("ios:");
    expect(config).toContain("{ googleServicesFile: googleServicesPlist }");
  });

  it("does not commit Firebase config payloads or secret values", () => {
    const config = read("mobile/app.config.js");
    const app = read("mobile/app.json");

    expect(config).not.toContain('"project_info"');
    expect(config).not.toContain('"api_key"');
    expect(config).not.toContain('"current_key"');
    expect(app).not.toContain('"googleServicesFile"');
    expect(app).not.toContain('"current_key"');
  });

  it("preserves the OPSIQO Pulse Android identity and H50.1P app version", () => {
    const app = JSON.parse(read("mobile/app.json"));

    expect(app.expo.slug).toBe("opsiqo-employee");
    expect(app.expo.version).toBe("0.1.5");
    expect(app.expo.android.package).toBe("ca.opsiqo.employee");
  });
});