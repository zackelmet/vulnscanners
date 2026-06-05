import { failScanAndRefund } from "@/lib/scans/settle";

// ── Minimal in-memory Firestore + admin doubles ─────────────────────────────
// Enough surface for failScanAndRefund: runTransaction, tx.get/tx.update,
// FieldValue.increment/serverTimestamp, Timestamp.now, and dotted field paths.

const SERVER_TS = "__SERVER_TS__";

function getNested(obj: any, path: string) {
  return path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
}
function setNested(obj: any, path: string, value: any) {
  const keys = path.split(".");
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    cur[keys[i]] = cur[keys[i]] ?? {};
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
}

function applyUpdate(doc: any, update: Record<string, any>) {
  for (const [key, value] of Object.entries(update)) {
    if (value && value.__op === "increment") {
      const current = Number(getNested(doc, key) ?? 0);
      setNested(doc, key, current + value.n);
    } else if (value === SERVER_TS) {
      setNested(doc, key, SERVER_TS);
    } else {
      setNested(doc, key, value);
    }
  }
}

interface SeedState {
  users: Record<string, any>;
  // keyed by `${userId}/${scanId}`
  scans: Record<string, any>;
}

function makeFirestore(seed: SeedState) {
  const store: SeedState = {
    users: JSON.parse(JSON.stringify(seed.users)),
    scans: JSON.parse(JSON.stringify(seed.scans)),
  };

  const scanKey = (uid: string, scanId: string) => `${uid}/${scanId}`;

  function docSnapshot(exists: boolean, data: any) {
    return { exists, data: () => (exists ? data : undefined) };
  }

  const scanRef = (uid: string, scanId: string) => ({
    __kind: "scan" as const,
    uid,
    scanId,
  });
  const userRef = (uid: string) => ({
    __kind: "user" as const,
    uid,
    collection: (name: string) => {
      expect(name).toBe("completedScans");
      return { doc: (scanId: string) => scanRef(uid, scanId) };
    },
  });

  const firestore = {
    collection: (name: string) => {
      expect(name).toBe("users");
      return { doc: (uid: string) => userRef(uid) };
    },
    runTransaction: async (fn: (tx: any) => Promise<any>) => {
      const tx = {
        get: async (ref: any) => {
          if (ref.__kind === "user") {
            const u = store.users[ref.uid];
            return docSnapshot(!!u, u);
          }
          const s = store.scans[scanKey(ref.uid, ref.scanId)];
          return docSnapshot(!!s, s);
        },
        update: (ref: any, update: Record<string, any>) => {
          if (ref.__kind === "user") {
            applyUpdate(store.users[ref.uid], update);
          } else {
            applyUpdate(store.scans[scanKey(ref.uid, ref.scanId)], update);
          }
        },
      };
      return fn(tx);
    },
  };

  return { firestore, store };
}

const admin = {
  firestore: {
    FieldValue: {
      increment: (n: number) => ({ __op: "increment", n }),
      serverTimestamp: () => SERVER_TS,
    },
    Timestamp: {
      now: () => ({ __ts: 1717600000000 }),
    },
  },
};

function seedActiveScan(overrides: Partial<any> = {}) {
  return {
    users: {
      u1: {
        scanCredits: { nmap: 0, nuclei: 5, zap: 5 },
        scansUsed: { nmap: 1, nuclei: 0, zap: 0 },
      },
    },
    scans: {
      "u1/s1": {
        scanId: "s1",
        userId: "u1",
        type: "nmap",
        status: "in_progress",
        ...overrides,
      },
    },
  } as SeedState;
}

describe("failScanAndRefund", () => {
  it("refunds an active scan once and marks it failed (reaper path)", async () => {
    const { firestore, store } = makeFirestore(seedActiveScan());

    const outcome = await failScanAndRefund(admin, firestore, {
      userId: "u1",
      scanId: "s1",
      reason: "timed out",
      markFailed: true,
    });

    expect(outcome).toBe("refunded");
    expect(store.users.u1.scanCredits.nmap).toBe(1); // refunded
    expect(store.users.u1.scansUsed.nmap).toBe(0); // reversed
    expect(store.scans["u1/s1"].status).toBe("failed");
    expect(store.scans["u1/s1"].creditRefunded).toBe(true);
    expect(store.scans["u1/s1"].errorMessage).toBe("timed out");
  });

  it("is idempotent — a second call does not double-refund", async () => {
    const { firestore, store } = makeFirestore(seedActiveScan());

    await failScanAndRefund(admin, firestore, {
      userId: "u1",
      scanId: "s1",
      markFailed: true,
    });
    const second = await failScanAndRefund(admin, firestore, {
      userId: "u1",
      scanId: "s1",
      markFailed: true,
    });

    expect(second).toBe("already-settled");
    expect(store.users.u1.scanCredits.nmap).toBe(1); // still just one refund
    expect(store.users.u1.scansUsed.nmap).toBe(0);
  });

  it("never refunds a completed scan", async () => {
    const { firestore, store } = makeFirestore(
      seedActiveScan({ status: "completed" }),
    );

    const outcome = await failScanAndRefund(admin, firestore, {
      userId: "u1",
      scanId: "s1",
      markFailed: true,
    });

    expect(outcome).toBe("completed-skip");
    expect(store.users.u1.scanCredits.nmap).toBe(0); // unchanged
    expect(store.scans["u1/s1"].status).toBe("completed");
  });

  it("refunds without changing status when markFailed is false (webhook path)", async () => {
    // Webhook already wrote status=failed before calling the helper.
    const { firestore, store } = makeFirestore(
      seedActiveScan({ status: "failed" }),
    );

    const outcome = await failScanAndRefund(admin, firestore, {
      userId: "u1",
      scanId: "s1",
      markFailed: false,
    });

    expect(outcome).toBe("refunded");
    expect(store.users.u1.scanCredits.nmap).toBe(1);
    expect(store.scans["u1/s1"].status).toBe("failed");
    expect(store.scans["u1/s1"].creditRefunded).toBe(true);
  });

  it("returns not-found for a missing scan", async () => {
    const { firestore } = makeFirestore(seedActiveScan());

    const outcome = await failScanAndRefund(admin, firestore, {
      userId: "u1",
      scanId: "does-not-exist",
      markFailed: true,
    });

    expect(outcome).toBe("not-found");
  });

  it("never drives scansUsed below zero on legacy docs", async () => {
    const seed = seedActiveScan();
    seed.users.u1.scansUsed.nmap = 0; // legacy doc with no recorded usage
    const { firestore, store } = makeFirestore(seed);

    const outcome = await failScanAndRefund(admin, firestore, {
      userId: "u1",
      scanId: "s1",
      markFailed: true,
    });

    expect(outcome).toBe("refunded");
    expect(store.users.u1.scanCredits.nmap).toBe(1);
    expect(store.users.u1.scansUsed.nmap).toBe(0); // clamped, not -1
  });
});
