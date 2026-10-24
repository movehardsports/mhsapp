// Type-level checks. They cost nothing at runtime: a mismatch fails `npm run typecheck`.

// True when two unions have exactly the same members.
export type SameUnion<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

// Compiles only for `true`, e.g. `Assert<SameUnion<A, B>>`.
export type Assert<T extends true> = T;
