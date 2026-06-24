---
name: Clerk Expo v3 Future API
description: Correct API methods for SignUpFutureResource and SignInFutureResource in @clerk/expo 3.x / @clerk/shared 4.12.x
---

## Sign-Up: SignUpFutureResource (from useSignUp())

All methods return `{ error: ClerkError | null }` — do NOT throw, do NOT use try/catch alone; always check `error`.

**Create account (email + password):**
```typescript
const { error } = await signUp.password({ emailAddress, password });
```

**Send email verification code:**
```typescript
const { error } = await signUp.verifications.sendEmailCode();
// NOT signUp.verifications.emailAddress.sendEmailCode() — that's wrong
```

**Verify the code:**
```typescript
const { error } = await signUp.verifications.verifyEmailCode({ code });
// NOT signUp.verifications.emailAddress.verifyEmailCode() — that's wrong
```

**Finalize session:**
```typescript
const { error } = await signUp.finalize();
// Then manually: router.replace("/(tabs)")
// Do NOT pass navigate callback — SetActiveNavigate type is incompatible with simple function
```

**Other properties:**
- `signUp.status: SignUpStatus` — 'complete', 'missing_requirements', etc.
- `signUp.unverifiedFields: SignUpIdentificationField[]` — check for 'email_address'

**WRONG methods (legacy SignUpResource only — do not use on FutureResource):**
- `prepareEmailAddressVerification()` — does NOT exist on FutureResource
- `attemptEmailAddressVerification()` — does NOT exist on FutureResource
- `create({ emailAddress, password })` — use `password()` instead for email+password

---

## Sign-In: SignInFutureResource (from useSignIn())

**Create sign-in attempt (identify user):**
```typescript
const { error } = await signIn.create({ identifier: email });
// SignInFutureCreateParams does NOT accept strategy:'reset_password_email_code'
```

**Password sign-in:**
```typescript
const { error } = await signIn.password({ password });
```

**Reset password flow (3 steps):**
```typescript
// Step 1: create({ identifier }) — identifies user
// Step 2:
const { error } = await signIn.resetPasswordEmailCode.sendCode();
// Step 3:
const { error } = await signIn.resetPasswordEmailCode.verifyCode({ code });
// status becomes 'needs_new_password'
// Step 4:
const { error } = await signIn.resetPasswordEmailCode.submitPassword({ password, signOutOfOtherSessions: true });
// status becomes 'complete'
```

**Finalize:**
```typescript
const { error } = await signIn.finalize();
// Do NOT pass navigate callback — SetActiveNavigate params incompatible with simple destructure
// Navigate manually: router.replace("/(tabs)")
```

**Why:** `SetActiveNavigate` is typed as `(params: { session: SessionResource; decorateUrl: DecorateUrl }) => void` not `(decorateUrl: fn) => void`, causing TS2322 errors when passing a simple function.

**How to apply:** Any time you modify auth flows in this Expo app. The `finalize()` call is always without `navigate`, followed by `router.replace`.
