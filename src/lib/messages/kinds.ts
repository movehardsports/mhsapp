import type { Database } from "@/lib/supabase/database.types";
import type { Assert, SameUnion } from "@/lib/types";

// What a chat message is: text from one of the two sides, or a system entry the database adds
// when the brand accepts the application, rejects it after accepting (closed) or accepts it again
// (reopened).
export const messageKinds = ["text", "accepted", "closed", "reopened"] as const;

export type MessageKind = (typeof messageKinds)[number];

// The database stores the kind as the `message_kind` enum (supabase/migrations). This fails
// typecheck when the two lists drift apart; regenerate the types with `npm run db:types`.
type DatabaseMessageKind = Database["public"]["Enums"]["message_kind"];
export type MessageKindsMatchDatabase = Assert<SameUnion<MessageKind, DatabaseMessageKind>>;
