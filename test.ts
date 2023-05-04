import { $ } from 'execa'

process.env.NODE_NO_WARNINGS='1'

import {
  mirror,
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

function getWorkerUrl() {
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

async function getWorkerResult() {
  const response = await fetch(getWorkerUrl())
  return await response.json() as WorkerResult
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
  const results: Record<string, WorkerResult | number | null> = {}
  const filters: string[] = filter.split(',')

  const filteredPoPs = PoPs.filter((v) => {
    return filters.some((f) => v.toLowerCase().includes(f))
  })

  console.log('Using the following PoP:')
  console.log(filteredPoPs)

  for (let PoP of filteredPoPs) {
    await retryWithExpBackOff(async () => {
      await $`expressvpn disconnect`.catch(() => {})
      await $`expressvpn connect ${PoP}`
    })
    const result = await retryWithExpBackOff(getWorkerResult)

    if (verbose === true) {
      results[PoP] = result
    } else {
      results[PoP] = result.time
    }

    console.log(`Finished ${PoP} with ${result.time}ms`)
  }

  console.log('Results:')
  console.log(JSON.stringify(results, null, 2))
}

void main()