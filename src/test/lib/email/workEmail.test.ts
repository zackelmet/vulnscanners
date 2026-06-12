import { validateWorkEmail } from "@/lib/email/workEmail";

describe("validateWorkEmail", () => {
  it("accepts a normal work email and normalizes it", () => {
    const r = validateWorkEmail("  Alice@Acme.io ");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.email).toBe("alice@acme.io");
      expect(r.domain).toBe("acme.io");
    }
  });

  it.each([
    "bob@gmail.com",
    "bob@googlemail.com",
    "bob@yahoo.com",
    "bob@outlook.com",
    "bob@hotmail.com",
    "bob@icloud.com",
    "bob@proton.me",
  ])("rejects free provider %s", (email) => {
    const r = validateWorkEmail(email);
    expect(r.ok).toBe(false);
  });

  it.each(["bob@mailinator.com", "bob@10minutemail.com", "bob@yopmail.com"])(
    "rejects disposable provider %s",
    (email) => {
      const r = validateWorkEmail(email);
      expect(r.ok).toBe(false);
    },
  );

  it.each([
    "",
    "not-an-email",
    "a@b",
    "@acme.io",
    "alice@",
    123,
    null,
    undefined,
  ])("rejects malformed input %p", (input) => {
    const r = validateWorkEmail(input as unknown);
    expect(r.ok).toBe(false);
  });
});
