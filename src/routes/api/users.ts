import { json } from "@tanstack/react-start";
import { createAPIFileRoute } from "@tanstack/react-start/api";
import { getBindings } from "~/utils/cf-bindings";

export const APIRoute = createAPIFileRoute("/api/users")({
  GET: async ({ request }) => {
    const bindings = getBindings();
    const deferredCount = await bindings.CACHE.get("mykey");
    const currentCount = deferredCount ? parseInt(deferredCount) : 0;
    const newCount = currentCount + 1;
    await bindings.CACHE.put("queryCount2", newCount.toString());
    return json({
      deferredCount,
    });
  },
});
