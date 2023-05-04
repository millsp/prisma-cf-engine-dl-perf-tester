export interface Env {
}

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext
	): Promise<Response> {
		if (request.url.endsWith('/favicon.ico')) {
			return new Response(null, { status: 404 });
		}

		const url = new URL(request.url)
		const params = Object.fromEntries(url.searchParams.entries())
		let { mirror, version, platform, engine, extension } = params

		if (mirror  === 'aws') {
			mirror = 'https://binaries.prisma.sh'
		} else if (params.mirror === 'r2') {
			mirror = 'https://engines.prisma.cool'
		}

		const engineUrl = `${mirror}/all_commits/${version}/${platform}/${engine}.${extension}`

		const timeStart = Date.now();
		const response = await fetch(engineUrl)
		const timeEnd = Date.now();

		console.log(`Fetched ${engineUrl} in ${timeEnd - timeStart}ms`)

		const result = {
			region: request.cf?.region,
			time: timeEnd - timeStart,
			status: response.status,
			size: Number(response.headers.get('content-length')) / 1000000,
		}

		return new Response(JSON.stringify(result));
	},
};
