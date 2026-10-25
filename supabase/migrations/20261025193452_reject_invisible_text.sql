-- Text made only of characters that show nothing looks blank, but `\S` counts many of them as
-- content: zero-width spaces and joiners, soft hyphen, direction marks, embeddings and isolates,
-- Hangul fillers, variation selectors, braille blank, byte order mark. Require at least one
-- visible character, in the trimmed_text domain (names, cities, campaign titles) and in campaign
-- descriptions.
--
-- Whitespace is listed one by one too (ASCII, NEL, Unicode spaces, line and paragraph
-- separators) instead of `\s`: what `\s` matches depends on the database's locale, so it could
-- differ between local (ICU) and hosted. The app checks the same list (hasVisibleText in
-- src/lib/validation.ts).
--
-- Both constraints check the existing rows, so this fails if a saved value is invisible-only.

alter domain public.trimmed_text
  add constraint trimmed_text_visible
  check (value ~ '[^\t\n\v\f\r \u0085\u00A0\u00AD\u034F\u061C\u115F\u1160\u1680\u17B4\u17B5\u180B-\u180F\u2000-\u200F\u2028-\u202F\u205F-\u206F\u2800\u3000\u3164\uFE00-\uFE0F\uFEFF\uFFA0]');

alter table public.campaigns
  add constraint campaigns_description_visible
  check (description ~ '[^\t\n\v\f\r \u0085\u00A0\u00AD\u034F\u061C\u115F\u1160\u1680\u17B4\u17B5\u180B-\u180F\u2000-\u200F\u2028-\u202F\u205F-\u206F\u2800\u3000\u3164\uFE00-\uFE0F\uFEFF\uFFA0]');
