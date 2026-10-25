// The minimum matches minimum_password_length in supabase/config.toml. Supabase hashes
// passwords with bcrypt, which only uses the first 72 bytes.
export const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_BYTES = 72;

// RFC 5321 limits an address to 254 characters; Auth rejects longer ones.
export const EMAIL_MAX = 254;

// The message for a password the sign-up form can't accept, or null when it's fine. The length
// counts characters, not UTF-16 units, so "😀😀😀ab" is 5 characters, not 8.
export function passwordProblem(password: string) {
  if ([...password].length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`;
  }
  if (password.trim() === "") return "Your password can't be only spaces.";
  if (new TextEncoder().encode(password).length > MAX_PASSWORD_BYTES) {
    return "Your password is too long.";
  }
  return null;
}

// A rough check, like the browser's: one @, no spaces, not too long. Auth checks the rest.
export function isEmailLike(email: string) {
  return email.length <= EMAIL_MAX && /^[^\s@]+@[^\s@]+$/.test(email);
}
