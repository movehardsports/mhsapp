// Type-level checks. They cost nothing at runtime: a mismatch fails `npm run typecheck`.

// True when two unions have exactly the same members.
export type SameUnion<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

// The result of parsing a form: the checked input, or a message. Either way the values the user
// typed, to echo back into the form.
export type Parsed<Values, Input> =
  { ok: true; values: Values; input: Input } | { ok: false; values: Values; message: string };

// Compiles only for `true`, e.g. `Assert<SameUnion<A, B>>`.
export type Assert<T extends true> = T;
