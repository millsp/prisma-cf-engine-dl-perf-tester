import { $ } from 'execa'

process.env.NODE_NO_WARNINGS='1'

import {
  runs,
  version,
  platform,
  engine,
  extension,
  filter,
  verbose,
} from './config.json'

const PoPs = [
  'Singapore - CBD',
  'Germany - Frankfurt - 1',
  'Hong Kong - 1',
  'Japan - Tokyo',
  'USA - San Francisco',
  'USA - Seattle',
  'USA - New York',
  'USA - Chicago',
  'USA - Miami',
  'USA - Atlanta',
  'Australia - Sydney',
  'Australia - Melbourne',
  'Australia - Perth',
  'Netherlands - Amsterdam',
  'New Zealand',
  'India (via Singapore)',
  'South Korea - 2',
  'Philippines',
  'Thailand',
  'UK - London',
  'Indonesia',
  'Taiwan - 3',
  'Canada - Toronto',
  'Canada - Vancouver',
  'Canada - Montreal',
  'Mexico',
  'Brazil',
  'Chile',
  'Argentina',
  'Colombia',
  'Sweden',
  'Switzerland',
  'Italy - Milan',
  'France - Paris - 1',
  'Romania',
  'Spain - Madrid',
  'Ireland',
  'Norway',
  'Denmark',
  'Finland',
  'Portugal',
  'Armenia',
  'South Africa',
  'Israel',
  'Egypt',
  'Kenya',
]

function getWorkerUrl(mirror: 'r2' | 'aws') {
  return `https://cf-dl-perf-tester.millsp.workers.dev/?mirror=${mirror}&version=${version}&platform=${platform}&engine=${engine}&extension=${extension}`
}

type WorkerResult =
| {
    region: string,
    time: number,
    status: number,
    size: number
  }
| {
    region: null,
    time: null,
    status: null,
    size: null
  }

async function getWorkerResult(mirror: 'r2' | 'aws') {
  const response = await fetch(getWorkerUrl(mirror))
  
  if (response.ok === false) {
    throw new Error(`Worker returned ${response.status}`)
  }

  return response.json() as WorkerResult
}

async function retryWithExpBackOff<T>(fn: () => Promise<T>, times = 3): Promise<T> {
  try {
    return await fn()
  } catch (e) {
    if (times > 0) {
      await new Promise((r) => setTimeout(r, 2 ** (3 - times) * 1000))
      return retryWithExpBackOff(fn, times - 1)
    } else {
      throw e
    }
  }
}

async function main() {
  const r2Results: Record<string, (WorkerResult | number | null)[]> = {}
  const s3Results: Record<string, (WorkerResult | number | null)[]> = {}
  const filters: string[] = filter.split(',')

  const filteredPoPs = PoPs.filter((v) => {
    return filters.some((f) => v.toLowerCase().includes(f))
  })

  console.log('Using the following PoP:')
  console.log(filteredPoPs)

  await $`expressvpn disconnect`.catch(() => {})
  for (let PoP of filteredPoPs) {
    await retryWithExpBackOff(async () => {
      await $`expressvpn disconnect`.catch(() => {})
      await $`expressvpn connect ${PoP}`
    })

    if (r2Results[PoP] === undefined) {
      r2Results[PoP] = []
    }

    if (s3Results[PoP] === undefined) {
      s3Results[PoP] = []
    }

    for (let i = 0; i < runs; i++) {
      const r2Result = await retryWithExpBackOff(() => getWorkerResult('r2'))
      r2Results[PoP].push(verbose ? r2Result : r2Result.time)
      console.log(`Finished r2/${PoP} run ${i + 1}/${runs} with ${r2Result.time}ms (${r2Result.status})`)

      const s3Result = await retryWithExpBackOff(() => getWorkerResult('aws'))
      s3Results[PoP].push(verbose ? s3Result : s3Result.time)
      console.log(`Finished s3/${PoP} run ${i + 1}/${runs} with ${s3Result.time}ms (${s3Result.status})`)
    }
  }

  console.log('R2 Results:')
  console.log(JSON.stringify(r2Results, null, 2))

  console.log('S3 Results:')
  console.log(JSON.stringify(s3Results, null, 2))
}

void main()
