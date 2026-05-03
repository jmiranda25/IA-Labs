import { describe, it, expect } from "vitest";
import {
  filterDemoUsers,
  assertCleanGuard,
  DEMO_DOMAIN,
  GUARD_EMAIL,
} from "./cleanGuard.js";

type FakeUser = { emailAddresses: { emailAddress: string }[] };

function makeUser(...emails: string[]): FakeUser {
  return { emailAddresses: emails.map((emailAddress) => ({ emailAddress })) };
}

describe("filterDemoUsers", () => {
  it("keeps only users whose email ends with DEMO_DOMAIN", () => {
    const demoUser = makeUser(`lucia${DEMO_DOMAIN}`);
    const realUser = makeUser("real@gmail.com");
    const mixed = makeUser("side@gmail.com", `carlos${DEMO_DOMAIN}`);

    const result = filterDemoUsers([demoUser, realUser, mixed]);

    expect(result).toHaveLength(2);
    expect(result).toContain(demoUser);
    expect(result).toContain(mixed);
    expect(result).not.toContain(realUser);
  });

  it("returns empty array when no users match", () => {
    const users = [makeUser("a@gmail.com"), makeUser("b@hotmail.com")];
    expect(filterDemoUsers(users)).toHaveLength(0);
  });

  it("returns all users when every user has a demo email", () => {
    const users = [
      makeUser(`a${DEMO_DOMAIN}`),
      makeUser(`b${DEMO_DOMAIN}`),
    ];
    expect(filterDemoUsers(users)).toHaveLength(2);
  });
});

describe("assertCleanGuard", () => {
  it("throws when GUARD_EMAIL appears in the demo user list", () => {
    const demoUsers = [
      makeUser(`lucia${DEMO_DOMAIN}`),
      makeUser(`carlos${DEMO_DOMAIN}`, GUARD_EMAIL),
    ];

    expect(() => assertCleanGuard(demoUsers)).toThrow(
      /Guard triggered.*mayckolco@gmail\.com/
    );
  });

  it("throws when GUARD_EMAIL is the only email on a user", () => {
    const demoUsers = [makeUser(GUARD_EMAIL)];

    expect(() => assertCleanGuard(demoUsers)).toThrow(
      /Guard triggered.*mayckolco@gmail\.com/
    );
  });

  it("does NOT throw when GUARD_EMAIL is absent", () => {
    const demoUsers = [
      makeUser(`lucia${DEMO_DOMAIN}`),
      makeUser(`carlos${DEMO_DOMAIN}`),
      makeUser(`maria${DEMO_DOMAIN}`),
    ];

    expect(() => assertCleanGuard(demoUsers)).not.toThrow();
  });

  it("does NOT throw for an empty list", () => {
    expect(() => assertCleanGuard([])).not.toThrow();
  });
});
