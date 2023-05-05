/// <reference types="@fastly/js-compute" />
// import { Logger } from "fastly:logger";
import { CacheOverride } from "fastly:cache-override";
import { env } from "fastly:env";

addEventListener("fetch", (event) => event.respondWith(handleRequest(event)));

const mirrors = ["r2", "aws", "r2_nocache"]

async function handleRequest(event: FetchEvent) {
  // Log service version
  console.log("FASTLY_SERVICE_VERSION:", env('FASTLY_SERVICE_VERSION') || 'local');

  let request = event.request;

  console.log("Request URL:", request.url);
  if (request.url.endsWith('/favicon.ico')) {
    return new Response(null, { status: 404 });
  }

  const url = new URL(request.url)
  const params = Object.fromEntries(url.searchParams.entries())
  let { mirror, version, platform, engine, extension, runs = 1 } = params

  const engineUrl = `/all_commits/${version}/${platform}/${engine}.${extension}`

  const results: any = {}
  for (const mirror of mirrors) {
    if (results[mirror] === undefined) {
      results[mirror] = []
    }

    for (let i = 0; i < Number(runs); i++) {
      const timeStart = Date.now();
      const timeFetchStart = Date.now();
      const response = await fetch(engineUrl, {
        backend: mirror,
        cacheOverride: new CacheOverride("pass"),
      })
  
      const timeFetchEnd = Date.now();
      const timeDataStart = Date.now();
      let data = await response.arrayBuffer();
      const timeDataEnd = Date.now();
      const timeEnd = Date.now();
  
      console.log(`Fetched ${engineUrl} in ${timeEnd - timeStart}ms`)
  
      const result = {
        status: response.status,
        timeTotal: timeEnd - timeStart,
        timeFetch: timeFetchEnd - timeFetchStart,
        timeData: timeDataEnd - timeDataStart,
        size: data.byteLength / 1000000,
        region: `${event.client.geo.country_code} ${event.client.geo.city}`,
        mirror,
        version: env('FASTLY_SERVICE_VERSION'),
      }
  
      results[mirror].push(result)
    }
  }

  return new Response(JSON.stringify(results, null, 2))
}
