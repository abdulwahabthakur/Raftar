# Branch Protection Setup

Apply these settings in GitHub → Settings → Branches after pushing.

## `master` (production)

Go to: https://github.com/abdulwahabthakur/Raftar/settings/branches → Add rule → `master`

| Setting | Value |
|---|---|
| Require a pull request before merging | ✅ |
| Required approvals | 1 |
| Dismiss stale reviews on new push | ✅ |
| Require status checks to pass | ✅ |
| Required checks | `TypeScript`, `Lint`, `Validate Migrations` |
| Require branches to be up to date | ✅ |
| Do not allow bypassing the above settings | ✅ |

## `develop` (integration)

Go to: https://github.com/abdulwahabthakur/Raftar/settings/branches → Add rule → `develop`

| Setting | Value |
|---|---|
| Require a pull request before merging | ✅ |
| Required approvals | 1 |
| Require status checks to pass | ✅ |
| Required checks | `TypeScript`, `Lint` |

---

## Required GitHub Secrets

Go to: https://github.com/abdulwahabthakur/Raftar/settings/secrets/actions

| Secret | Where to get it | Used by |
|---|---|---|
| `SUPABASE_ACCESS_TOKEN` | supabase.com → Account → Access Tokens | deploy-backend.yml |
| `SUPABASE_PROJECT_REF` | Supabase dashboard URL: `app.supabase.com/project/<ref>` | deploy-backend.yml |
| `SUPABASE_ANON_KEY` | Supabase dashboard → Project Settings → API | deploy-backend.yml (healthcheck) |
| `EXPO_TOKEN` | expo.dev → Account → Access Tokens | eas-build.yml |
| `EXPO_PUBLIC_SUPABASE_URL` | Same as .env | eas-build.yml |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Same as .env | eas-build.yml |
| `EXPO_PUBLIC_MAPBOX_TOKEN` | mapbox.com → Tokens | eas-build.yml |
| `MAPBOX_DOWNLOAD_TOKEN` | mapbox.com → Tokens (secret scope) | eas-build.yml |

---

## Branch Flow

```
feature/* or fix/*
      │
      ▼ PR + CI checks
   develop
      │
      ▼ PR + CI checks + 1 approval
   master  ──► deploy-backend.yml (Supabase)
           └──► eas-build.yml (mobile)
```
