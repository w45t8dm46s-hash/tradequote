---
name: Clerk Core v3 password reset API
description: The correct Clerk Core v3 (expo SDK) API for password reset via email code — NOT the standard Clerk signIn.create() pattern.
---

# Clerk Core v3 Password Reset Flow

## The Rule

In Clerk Core v3 (`@clerk/expo@3.x` → re-exports `@clerk/react@6.x`), the `signIn` object from `useSignIn()` exposes `resetPasswordEmailCode` as a **sub-namespace object**, NOT a callable function.

**DO NOT use:**
- `signIn.resetPasswordEmailCode()` — TypeError, it's an Object
- `signIn.create({ strategy: "reset_password_email_code", identifier })` — returns 422 from Clerk API

**Correct 3-step API:**
```ts
// Step 1: Send the code
const { error } = await signIn.resetPasswordEmailCode.sendCode({ identifier: email });

// Step 2: Verify the code
const { error } = await signIn.resetPasswordEmailCode.verifyCode({ code });

// Step 3: Set the new password
const { error } = await signIn.resetPasswordEmailCode.submitPassword({ password });

// Step 4: Finalize session if complete
if (signIn.status === "complete") {
  await signIn.finalize({ navigate: ... });
}
```

**Why:** Confirmed in `@clerk/react@6.6.6` dist/index.js — `wrapMethods` wraps the sub-namespace with `["sendCode", "verifyCode", "submitPassword"]`. The standard `signIn.create({ strategy })` is the OLD Clerk SDK pattern (pre-v3/pre-v6) and returns 422 on Replit-managed Clerk v3.

**How to apply:** Any time forgot-password / password reset is needed in this Expo app, use the 3-step `resetPasswordEmailCode.*` pattern above. The sub-namespace methods return `{ error }` on failure (v3 pattern) rather than throwing — handle both.

## Full API reference for sign-in v3 hook

`useSignIn()` returns `{ signIn, errors, fetchStatus }` where:
- `signIn.password({ emailAddress, password })` → `{ error }` — email+password sign-in
- `signIn.finalize({ navigate })` — set active session when `signIn.status === "complete"`
- `signIn.resetPasswordEmailCode.sendCode({ identifier })` → `{ error }`
- `signIn.resetPasswordEmailCode.verifyCode({ code })` → `{ error }`
- `signIn.resetPasswordEmailCode.submitPassword({ password })` → `{ error }`
- `signIn.mfa.sendEmailCode()` / `signIn.mfa.verifyEmailCode({ code })` — MFA
- `signIn.reset()` — reset signIn state
- `errors.fields.*` — reactive field-level errors
- `fetchStatus === "fetching"` — loading state
