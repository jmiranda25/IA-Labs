import { describe, it, expect, vi } from "vitest";
import { cleanWithDeps, type CleanDeps, type CleanUser } from "./seedDemoClean.js";
import { GUARD_EMAIL, DEMO_DOMAIN } from "./cleanGuard.js";

function makeUser(id: string, ...emails: string[]): CleanUser {
  return { id, emailAddresses: emails.map((emailAddress) => ({ emailAddress })) };
}

function buildDeps(users: CleanUser[]): {
  deps: CleanDeps;
  executeStub: ReturnType<typeof vi.fn>;
  deleteUserStub: ReturnType<typeof vi.fn>;
  endStub: ReturnType<typeof vi.fn>;
} {
  const executeStub = vi.fn().mockResolvedValue({ rowCount: 0 });
  const deleteUserStub = vi.fn().mockResolvedValue(undefined);
  const endStub = vi.fn().mockResolvedValue(undefined);

  const deps: CleanDeps = {
    clerk: {
      users: {
        getUserList: vi.fn().mockResolvedValue({ data: users }),
        deleteUser: deleteUserStub,
      },
    },
    db: { execute: executeStub },
    pool: { end: endStub },
  };

  return { deps, executeStub, deleteUserStub, endStub };
}

/** Assert that every db.execute call passes a SQL query scoped to DEMO_DOMAIN. */
function expectAllDbCallsScopedToDomain(
  executeStub: ReturnType<typeof vi.fn>
): void {
  for (const [sqlObj] of executeStub.mock.calls) {
    const serialized = JSON.stringify(sqlObj);
    expect(serialized, `db.execute called without ${DEMO_DOMAIN} scope`).toContain(
      DEMO_DOMAIN
    );
  }
}

describe("cleanWithDeps — guard behaviour", () => {
  it("throws when GUARD_EMAIL is the primary address on an account that also has a demo address", async () => {
    const users = [
      makeUser("uid-demo1", `alice${DEMO_DOMAIN}`),
      makeUser("uid-guard", GUARD_EMAIL, `carlos${DEMO_DOMAIN}`),
    ];
    const { deps, executeStub, deleteUserStub } = buildDeps(users);

    await expect(cleanWithDeps(deps)).rejects.toThrow(
      /Guard triggered.*mayckolco@gmail\.com/
    );

    expect(executeStub).not.toHaveBeenCalled();
    expect(deleteUserStub).not.toHaveBeenCalled();
  });

  it("throws when GUARD_EMAIL is a secondary address alongside a demo address", async () => {
    const users = [
      makeUser("uid-demo1", `alice${DEMO_DOMAIN}`),
      makeUser("uid-guard", `carlos${DEMO_DOMAIN}`, GUARD_EMAIL),
    ];
    const { deps, executeStub, deleteUserStub } = buildDeps(users);

    await expect(cleanWithDeps(deps)).rejects.toThrow(/Guard triggered/);

    expect(executeStub).not.toHaveBeenCalled();
    expect(deleteUserStub).not.toHaveBeenCalled();
  });
});

describe("cleanWithDeps — normal clean (no guard email)", () => {
  it("calls deleteUser only for @aicomunidad.dev users, not for real users", async () => {
    const demoA = makeUser("uid-a", `alice${DEMO_DOMAIN}`);
    const demoB = makeUser("uid-b", `bob${DEMO_DOMAIN}`);
    const realUser = makeUser("uid-real", "real@gmail.com");

    const { deps, deleteUserStub } = buildDeps([demoA, demoB, realUser]);

    await cleanWithDeps(deps);

    expect(deleteUserStub).toHaveBeenCalledTimes(2);
    expect(deleteUserStub).toHaveBeenCalledWith("uid-a");
    expect(deleteUserStub).toHaveBeenCalledWith("uid-b");
    expect(deleteUserStub).not.toHaveBeenCalledWith("uid-real");
  });

  it("scopes every DB delete to the @aicomunidad.dev email pattern", async () => {
    const users = [makeUser("uid-a", `alice${DEMO_DOMAIN}`)];
    const { deps, executeStub } = buildDeps(users);

    await cleanWithDeps(deps);

    expect(executeStub).toHaveBeenCalled();
    expectAllDbCallsScopedToDomain(executeStub);
  });

  it("executes DB deletes and ends the pool after guard passes", async () => {
    const users = [makeUser("uid-a", `alice${DEMO_DOMAIN}`)];
    const { deps, executeStub, endStub } = buildDeps(users);

    await cleanWithDeps(deps);

    expect(executeStub).toHaveBeenCalled();
    expect(endStub).toHaveBeenCalledOnce();
  });

  it("still runs DB deletes (by email pattern) even when Clerk returns no demo users", async () => {
    const { deps, executeStub, deleteUserStub } = buildDeps([]);

    await cleanWithDeps(deps);

    expect(deleteUserStub).not.toHaveBeenCalled();
    expect(executeStub).toHaveBeenCalled();
  });
});
