---
name: Clerk v3 Sign-In Flow (Expo Reactive API)
description: Correct sign-in pattern for @clerk/expo ^3.2.14 using the reactive (signals) API
---

## The Rule

Use `signIn.create({ identifier, password })` wrapped in try/catch for password sign-in. Never use `signIn.password({ emailAddress, password })`.

**Why:** `signIn.password()` is a *factor-attempt* method — it attempts the password factor on an already-created sign-in session. Calling it without first creating a session via `signIn.create()` makes it no-op silently (no error returned, status never reaches "complete"). Also, `emailAddress` is a sign-up field; sign-in uses `identifier`.

Additionally: `gateMethod()` (which wraps all `signIn.*` methods) calls the underlying clerk-js method directly. clerk-js **throws** `ClerkAPIResponseError` on auth failure — it does NOT return `{ error }`. Always use try/catch, not `const { error } = await signIn.create(...)`.

**How to apply:** For any password sign-in in this codebase:
```typescript
try {
  await signIn.create({ identifier: email, password });
} catch (err: any) {
  const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || err?.message || "Invalid email or password.";
  setGeneralError(msg);
  return;
}
if (signIn.status === "complete") {
  await signIn.finalize({ navigate: ({ decorateUrl }) => { ... } });
}
```

## Key Differences: Sign-Up vs Sign-In (Clerk v3 reactive)

| Context | Correct API | Error pattern |
|---------|-------------|---------------|
| Sign-up (create account) | `signUp.password({ emailAddress, password })` | Returns `{ error }` (reactive) |
| Sign-in (authenticate) | `signIn.create({ identifier, password })` | **Throws** exception |

Sign-up uses a different reactive wrapper (`buildSignUpProxy`) that DOES return `{ error }`.
Sign-in's `create` goes through `gateMethod` which returns the raw clerk-js result (throws on error).

## finalize() for navigation
After `signIn.status === "complete"`, call `signIn.finalize({ navigate: ({ decorateUrl }) => { ... } })`.
This handles URL decoration for web (Expo web) and native router navigation.
Do NOT use `setActive` — it is not returned by `useSignIn()` in this reactive API.
