#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const ENTRY_WORKSPACE = 'packages/web'
const WORKSPACE_FIELDS = ['dependencies', 'optionalDependencies', 'peerDependencies', 'peerDependenciesMeta']
const ROOT_FIELDS = ['resolutions', 'overrides', 'trustedDependencies']
const COPIED_FILES = ['bun.lock', 'bunfig.toml']

function main() {
    const [, , srcArg, outArg] = process.argv
    if (!srcArg || !outArg) {
        console.error('Usage: node scripts/web-lockfile.oro.js <repository root> <output directory>')
        process.exit(1)
    }
    const src = path.resolve(srcArg)
    const out = path.resolve(outArg)
    const root = readJson(path.join(src, 'package.json'))
    const workspaceByName = findWorkspaces({ src, patterns: root.workspaces })
    const keep = collectRuntimeWorkspaces({ src, workspaceByName })

    fs.rmSync(out, { recursive: true, force: true })
    for (const dir of keep) {
        const manifest = readJson(path.join(src, dir, 'package.json'))
        writeJson(path.join(out, dir, 'package.json'), {
            name: manifest.name,
            version: manifest.version,
            ...pick({ source: manifest, fields: WORKSPACE_FIELDS }),
        })
    }
    writeJson(path.join(out, 'package.json'), {
        name: root.name,
        private: true,
        workspaces: keep,
        ...pick({ source: root, fields: ROOT_FIELDS }),
    })
    for (const file of COPIED_FILES.filter((f) => fs.existsSync(path.join(src, f)))) {
        fs.copyFileSync(path.join(src, file), path.join(out, file))
    }
    console.log(`Web lockfile workspaces in ${out}:\n  ${keep.join('\n  ')}`)
}

function findWorkspaces({ src, patterns }) {
    const dirs = patterns.flatMap((pattern) => expandPattern({ src, pattern }))
    return new Map(
        dirs
            .filter((dir) => fs.existsSync(path.join(src, dir, 'package.json')))
            .map((dir) => [readJson(path.join(src, dir, 'package.json')).name, dir]),
    )
}

function expandPattern({ src, pattern }) {
    if (!pattern.endsWith('/*')) {
        return [pattern]
    }
    const base = pattern.slice(0, -2)
    if (!fs.existsSync(path.join(src, base))) {
        return []
    }
    return fs.readdirSync(path.join(src, base), { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => path.posix.join(base, entry.name))
}

function collectRuntimeWorkspaces({ src, workspaceByName }) {
    const keep = new Set()
    const queue = [ENTRY_WORKSPACE]
    while (queue.length > 0) {
        const dir = queue.shift()
        if (keep.has(dir)) {
            continue
        }
        keep.add(dir)
        const manifest = readJson(path.join(src, dir, 'package.json'))
        const workspaceDeps = Object.entries(manifest.dependencies ?? {})
            .filter(([, range]) => String(range).startsWith('workspace:'))
            .map(([name]) => name)
        for (const name of workspaceDeps) {
            if (!workspaceByName.has(name)) {
                console.error(`${dir} depends on ${name}, but no workspace declares this name`)
                process.exit(1)
            }
            queue.push(workspaceByName.get(name))
        }
    }
    return [...keep].sort()
}

function pick({ source, fields }) {
    return Object.fromEntries(fields.filter((field) => source[field] !== undefined).map((field) => [field, source[field]]))
}

function readJson(file) {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function writeJson(file, data) {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n')
}

main()
