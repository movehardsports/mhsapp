# MHS — Move Hard Sports

Next.js 16 (App Router) + React 19 + Tailwind CSS 4.

## Development

```bash
npm install
npm run dev        # http://localhost:3000
```

| Script              | What it does                                              |
| ------------------- | --------------------------------------------------------- |
| `npm run lint`      | ESLint                                                    |
| `npm run typecheck` | Generates Next route types, then runs `tsc`               |
| `npm run test:e2e`  | Builds the app and runs Playwright on desktop and mobile  |

CI runs all three on every pull request.

## Structure

```
src/
├── app/
│   ├── (auth)/          sign-in, sign-up (shared layout, URLs have no prefix)
│   └── onboarding/      athlete, brand
├── components/
│   ├── header/          Header, menus, navigation links
│   ├── auth/            sign-in and sign-up forms
│   ├── onboarding/      onboarding forms
│   ├── forms/           Field, SubmitButton, TagPicker
│   └── ui/              shared styles, PageTitle
└── lib/                 account types, sports list
e2e/                     Playwright tests
```

Forms are UI only for now; saving data and auth come with Supabase.
