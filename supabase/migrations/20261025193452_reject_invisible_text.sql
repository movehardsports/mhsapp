-- Text made only of whitespace and invisible format characters (soft hyphen, zero-width
-- spaces and joiners, direction marks, word joiner and friends, byte order mark) looks blank,
-- but `\S` counts those characters as content. Require at least one visible character, in
-- the trimmed_text domain and in campaign descriptions. The app checks the same set
-- (hasVisibleText in src/lib/validation.ts).
--
-- Both constraints check the existing rows, so this fails if a saved value is invisible-only.

alter domain public.trimmed_text
  add constraint trimmed_text_visible
  check (value ~ '[^\s\u00AD\u200B-\u200F\u2060-\u2064\uFEFF]');

alter table public.campaigns
  add constraint campaigns_description_visible
  check (description ~ '[^\s\u00AD\u200B-\u200F\u2060-\u2064\uFEFF]');
