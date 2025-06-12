> **⚠️ IMPORTANT NOTICE**
>
> **TanStack Start Beta is now live!** This repository and guide are now **outdated**.
>
> For the latest implementation, please follow the updated guide here:
> **https://github.com/backpine/tanstack-start-beta-on-cloudflare**
## Tanstack Start on Workers v0

### Step 1: Create project from Tanstack Start quickstart
You can start a new project using [Tanstack Start's quickstart](https://tanstack.com/start/latest/docs/framework/react/quick-start).

### Step 2: Update the app.config.ts file with Cloudflare preset

```ts
import { defineConfig } from "@tanstack/react-start/config";
import tsConfigPaths from "vite-tsconfig-paths";
import { cloudflare } from "unenv";

export default defineConfig({
  server: {
    preset: "cloudflare-module",
    unenv: cloudflare,
  },
  tsr: {
    appDirectory: "src",
  },
  vite: {
    plugins: [
      tsConfigPaths({
        projects: ["./tsconfig.json"],
      }),
    ],
  },
});
```
The `cloudflare-module` preset attempts to make the build compatible with Cloudflare's worker runtime. It outputs the build into the `.output` directory.

The Cloudflare entrypoint is in the `.output/server/index.mjs` file. All assets are in `.output/public`.


### Step 3: Install and configure nitroCloudflareBindings module in the app.config.ts file

```ts
import { defineConfig } from "@tanstack/react-start/config";
import tsConfigPaths from "vite-tsconfig-paths";
import { cloudflare } from "unenv";
import nitroCloudflareBindings from "nitro-cloudflare-dev";

export default defineConfig({
  server: {
    preset: "cloudflare-module",
    unenv: cloudflare,
    modules: [nitroCloudflareBindings],
  },
  tsr: {
    appDirectory: "src",
  },
  vite: {
    plugins: [
      tsConfigPaths({
        projects: ["./tsconfig.json"],
      }),
    ],
  },
});
```
This plugin provides your app access to Cloudflare's Worker bindings when running locally. It mirrors the production bindings so you can access the Cloudflare Dev resources locally such as KV, D1, and R2.

If you change your dev script to `wrangler dev`, you can access the bindings in server components from `process.env`. (That said, I found a workaround that allows you to still use vinxi, which will be discussed later.)

### Step 4: Configure your wrangler config in wrangler.jsonc
```
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "tanstack-start-on-workers-v0",
  "main": ".output/server/index.mjs",
  "compatibility_date": "2025-04-10",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": ".output/public",
  },
  "observability": {
    "enabled": true,
  },
  "kv_namespaces": [
    {
      "binding": "CACHE",
      "id": "5d8a8ea387f348f7a156ffd98384998c",
    },
  ],
  "routes": [
    {
      "custom_domain": true,
      "pattern": "tanstackstart.backpine.com",
    },
  ],
}
```

### Step 5: Add wrangler commands to scripts in package.json
```
    "deploy": "npm run build && wrangler deploy",
    "cf-typegen": "wrangler types --env-interface CloudflareBindings"
```
Run `npm run cf-typegen` to generate the types for the Cloudflare bindings.

### Step 6: Deploy your app to ensure all is working
Run `npm run deploy` to deploy your app to Cloudflare Workers.


### Step 7: Define a helper method to get access to the Cloudflare bindings
```ts
/**
 * Will only work when being accessed on the server. Obviously, CF bindings are not available in the browser.
 * @returns
 */
export function getBindings() {
  if (import.meta.env.DEV) {
    const proxyPromise = import("wrangler").then(({ getPlatformProxy }) =>
      getPlatformProxy().then((proxy) => proxy.env),
    );
    return proxyPromise as unknown as CloudflareBindings;
  }

  return process.env as unknown as CloudflareBindings;
}
```

For CF apps built with Nitro, the CloudflareBindings can be accessed from process.env. There are a few other ways of accessing the bindings, but I ran across some issues with SSR when using getEvent().context.cloudflare.env.

I'm aware that this is not the most elegant solution, but it works for now.

To get your bindings to work locally with vinxi, you can access the bindings using the getPlatformProxy method from wrangler. This logic is placed under a check if import.meta.env.DEV is true.

To set the DEV environment variable in your local environment, use the `.dev.vars` file.

```
# .dev.vars
DEV=true
```

### Step 8: Use the getBindings method to access the Cloudflare bindings in server side logic
```ts
const bindings = getBindings();
const cache = bindings.CACHE;
const queryCount = (await cache.get("queryCount")) || "0";
await cache.put("queryCount", String(Number(queryCount) + 1));
```

This should work both locally and on Cloudflare Workers.
