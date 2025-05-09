import { json } from "@tanstack/react-start";
import { createAPIFileRoute } from "@tanstack/react-start/api";
import { getBindings } from "~/utils/cf-bindings";

export const APIRoute = createAPIFileRoute("/api/users")({
  GET: async ({ request }) => {
    console.info("Fetching users... @", request.url);
    const res = await fetch("https://jsonplaceholder.typicode.com/users");
    if (!res.ok) {
      throw new Error("Failed to fetch users");
    }
    // Access CF bindings in API Route
    const bindings = await getBindings();
    const deferredCount = await bindings.CACHE.get("queryCount");

    const data = (await res.json()) as Array<any>;

    const list = data.slice(0, 10);

    return json(
      list.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        deferredCount,
      })),
    );
  },
});
