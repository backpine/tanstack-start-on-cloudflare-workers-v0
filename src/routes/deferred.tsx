import { Await, createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Suspense, useState } from "react";
import { getBindings } from "~/utils/cf-bindings";

const personServerFn = createServerFn({ method: "GET" })
  .validator((d: string) => d)
  .handler(({ data: name }) => {
    return { name, randomNumber: Math.floor(Math.random() * 100) };
  });

const slowServerFn = createServerFn({ method: "GET" })
  .validator((d: string) => d)
  .handler(async ({ data: name }) => {
    const bindings = await getBindings();
    const cache = bindings.CACHE;
    const queryCount = (await cache.get("queryCount")) || "0";
    await cache.put("queryCount", String(Number(queryCount) + 1));
    await new Promise((r) => setTimeout(r, 1000));
    return { name, randomNumber: Math.floor(Math.random() * 100), queryCount };
  });

export const Route = createFileRoute("/deferred")({
  loader: async () => {
    return {
      deferredStuff: new Promise<string>((r) =>
        setTimeout(() => r("Hello deferred!"), 2000),
      ),
      deferredPerson: slowServerFn({ data: "Tanner Linsley" }),
      person: await personServerFn({ data: "John Doe" }),
    };
  },
  component: Deferred,
});

function Deferred() {
  const [count, setCount] = useState(0);
  const { deferredStuff, deferredPerson, person } = Route.useLoaderData();

  return (
    <div className="p-2">
      <div data-testid="regular-person">
        {person.name} - {person.randomNumber}
      </div>
      <Suspense fallback={<div>Loading person...</div>}>
        <Await
          promise={deferredPerson}
          children={(data) => (
            <div data-testid="deferred-person">
              {data.name} - {data.randomNumber} - Cache hit Count:{" "}
              {data.queryCount} 👈 From Cloudflare KV
            </div>
          )}
        />
      </Suspense>
      <Suspense fallback={<div>Loading stuff...</div>}>
        <Await
          promise={deferredStuff}
          children={(data) => <h3 data-testid="deferred-stuff">{data}</h3>}
        />
      </Suspense>
      <div>Count: {count}</div>
      <div>
        <button onClick={() => setCount(count + 1)}>Increment</button>
      </div>
    </div>
  );
}
