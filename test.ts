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
  'France - Strasbourg',
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

const mirrors = ["r2", "aws", "r2_nocache"]

function getWorkerUrl() {
  return `https://ghastly-settled-seahorse.edgecompute.app/?version=${version}&platform=${platform}&engine=${engine}&extension=${extension}&runs=${runs}`
}

type WorkerResult =
| {
    status: number,
    timeTotal: number,
    timeFetch: number,
    timeData: number,
    size: number,
    region: string,
    mirror: string,
    version: string,
  }
| {
    status: number,
    timeTotal: null,
    timeFetch: null,
    timeData: null,
    size: null,
    region: string,
    mirror: string,
    version: string,
  }

async function getWorkerResult() {
  const response = await fetch(getWorkerUrl())
  
  if (response.ok === false) {
    throw new Error(`Worker returned ${response.status}`)
  }
  
  const popResult = await response.json() as Record<string, WorkerResult[]>

  for (const [mirror, results] of Object.entries(popResult)) {
    results.forEach((result) => {
      if (result.status !== 200) {
        result.timeTotal = null
        result.timeFetch = null
        result.timeData = null
        result.size = null
      }
    })
  }

  return popResult
}

async function retryWithExpBackOff<T>(fn: () => Promise<T>, times = 3): Promise<T> {
  try {
    return await fn()
  } catch (e) {
    if (times > 0) {
      await new Promise((r) => setTimeout(r, 2 ** (3 - times) * 1000))
      console.log('Retrying...')
      return retryWithExpBackOff(fn, times - 1)
    } else {
      throw e
    }
  }
}

async function main() {
  const allResults: Record<string, Record<string, WorkerResult[]>> = {}
  const filters: string[] = filter.split(',')

  const filteredPoPs = PoPs.filter((v) => {
    return filters.some((f) => v.toLowerCase().includes(f))
  })

  console.log('Using the following PoP:')
  console.log(filteredPoPs)

  await $`expressvpn disconnect`.catch(() => {})
  for (let pop of filteredPoPs) {
    if (allResults[pop] === undefined) {
      allResults[pop] = {}
    }

    console.log('')
    console.log(`Testing via: ${pop}`)

    await retryWithExpBackOff(async () => {
      console.time('Connecting took')
      await $`expressvpn disconnect`.catch(() => {})
      await $`expressvpn connect ${pop}`
      console.timeEnd('Connecting took')

      allResults[pop] = await getWorkerResult()
    })

    if (verbose) {
      for (const [mirror, popResults] of Object.entries(allResults[pop])) {
        popResults.forEach((result, i) => {
          console.log(`${pop} - ${mirror} - n°${i + 1}: ${JSON.stringify(result)}`)
        })
      }
    }
  }

  console.log('')
  console.log('You can copy paste this into sheets')

  let table = `PoP`
  for (const mirror of mirrors) {
    for (let i = 0; i < runs; i++) {
      table = `${table}\t${mirror} n°${i + 1}`
    }
  }

  console.log(table)

  for (const pop of Object.keys(allResults)) {
    let sheetsResult = `${pop}`
    for (const mirror of Object.keys(allResults[pop])) {
      for (const result of allResults[pop][mirror]) {
        sheetsResult = `${sheetsResult}\t${result.timeTotal}`
      }
    }

    console.log(sheetsResult)
  }
}

void main()
