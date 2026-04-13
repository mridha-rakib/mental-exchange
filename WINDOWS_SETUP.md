# Windows setup

This project uses PocketBase for products, users, orders, favorites, seller flows, admin pages, and email records. The exported PocketBase binary is Linux-only, so Windows needs its own `pocketbase.exe`.

## First-time setup

```powershell
npm install
npm run setup:windows
```

`setup:windows` downloads the PocketBase version listed in `apps/pocketbase/.pocketbase-version` and applies the migrations into `apps/pocketbase/pb_data_local`.

The original exported `apps/pocketbase/pb_data` directory is left alone. It requires the missing original `PB_ENCRYPTION_KEY`, so local Windows development uses `pb_data_local` instead.

## Run locally

```powershell
npm run dev
```

Local services:

- Web: `http://localhost:3000`
- API: `http://localhost:3001`
- PocketBase: `http://127.0.0.1:8090`
- PocketBase dashboard: `http://127.0.0.1:8090/_/`

The Vite dev server proxies the existing app paths:

- `/hcgi/platform` -> PocketBase
- `/hcgi/api` -> API server

## Local PocketBase env

PocketBase reads `apps/pocketbase/.env`. For local-only development this repository includes a generated dev encryption key and the same superuser credentials expected by `apps/api/.env`.
