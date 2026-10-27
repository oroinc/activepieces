#!/usr/bin/env node
// Usage: node scripts/piece-hostnames.js <piece-name> [piece-name...]
//        node scripts/piece-hostnames.js --file names.txt
//        node scripts/piece-hostnames.js --all          (every piece under both PIECES_ROOTS)
//
// Scans each piece's source for literal https?:// URLs and prints the
// distinct hostnames found, so an outbound-connection allowlist can be
// requested from cloud/infra for a given set of pieces.
//
// Heuristic, not exhaustive: it only catches hostnames written as string
// literals in the piece's own code. It cannot see URLs built dynamically
// (e.g. `${subdomain}.example.com`) or hosts only reachable via a shared
// OAuth/base-URL passed in from elsewhere. Review the output before
// sending it to infra.

const fs = require('fs');
const path = require('path');

const PIECES_ROOTS = [
	path.join(__dirname, '..', 'packages', 'pieces', 'community'),
	path.join(__dirname, '..', 'packages', 'pieces', 'core'),
];

const IGNORED_HOSTS = new Set([
	'activepieces.com',
	'www.activepieces.com',
	'cdn.activepieces.com',
	'example.com',
	'localhost',
	'schema.org',
	'json-schema.org',
]);

const URL_RE = /https?:\/\/[^\s'"`)>,;]+/g;
const VALID_HOSTNAME_RE = /^[a-z0-9.-]+$/i;

function slugify(name) {
	return name.toLowerCase().trim().replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function findPieceDir(name) {
	const slug = slugify(name);
	for (const root of PIECES_ROOTS) {
		const direct = path.join(root, slug);
		if (fs.existsSync(direct)) return direct;
	}
	for (const root of PIECES_ROOTS) {
		const collapsed = slug.replace(/-/g, '');
		const match = fs.readdirSync(root).find((dir) => dir.replace(/-/g, '') === collapsed);
		if (match) return path.join(root, match);
	}
	return null;
}

function walkTsFiles(dir) {
	const results = [];
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		if (entry.name === 'node_modules' || entry.name === 'dist') continue;
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			results.push(...walkTsFiles(full));
		} else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) {
			results.push(full);
		}
	}
	return results;
}

function extractHostnames(pieceDir) {
	const hosts = new Set();
	const dynamicHosts = new Set();
	for (const file of walkTsFiles(path.join(pieceDir, 'src'))) {
		const content = fs.readFileSync(file, 'utf8');
		for (const match of content.matchAll(URL_RE)) {
			try {
				const hostname = new URL(match[0]).hostname;
				if (IGNORED_HOSTS.has(hostname)) continue;
				if (VALID_HOSTNAME_RE.test(hostname)) {
					hosts.add(hostname);
				} else {
					dynamicHosts.add(hostname);
				}
			} catch {
				// not a parseable URL, skip
			}
		}
	}
	return { hosts, dynamicHosts };
}

function main() {
	const args = process.argv.slice(2);
	if (args.length === 0) {
		console.error('Usage: node scripts/piece-hostnames.js <piece-name> [piece-name...]');
		console.error('       node scripts/piece-hostnames.js --file names.txt');
		console.error('       node scripts/piece-hostnames.js --all');
		process.exit(1);
	}

	const names =
		args[0] === '--file'
			? fs
					.readFileSync(args[1], 'utf8')
					.split('\n')
					.map((line) => line.trim())
					.filter(Boolean)
			: args[0] === '--all'
				? PIECES_ROOTS.flatMap((root) => fs.readdirSync(root)).sort()
				: args;

	const allHosts = new Set();
	const allDynamicHosts = new Set();
	const notFound = [];

	for (const name of names) {
		const dir = findPieceDir(name);
		if (!dir) {
			notFound.push(name);
			continue;
		}
		const { hosts, dynamicHosts } = extractHostnames(dir);
		console.log(`${name}:`);
		for (const host of [...hosts].sort()) {
			console.log(`  ${host}`);
			allHosts.add(host);
		}
		for (const host of [...dynamicHosts].sort()) {
			console.log(`  ${host}  (dynamic — placeholder in code, check src for real values)`);
			allDynamicHosts.add(host);
		}
	}

	console.log('\n# Combined unique hostnames');
	for (const host of [...allHosts].sort()) console.log(host);

	if (allDynamicHosts.size) {
		console.log('\n# Dynamic hostnames — NOT resolvable from source alone, check manually');
		for (const host of [...allDynamicHosts].sort()) console.log(host);
	}

	if (notFound.length) {
		console.error(`\n# Could not resolve these piece names: ${notFound.join(', ')}`);
	}
}

main();
