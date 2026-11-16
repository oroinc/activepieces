/* eslint-disable @typescript-eslint/no-require-imports */
// Creates the first platform admin and their personal project, the way the dev seed does.
// Run it once the app has started and migrated the database:
//   AP_ADMIN_PASSWORD=... node scripts/create-admin.js --email admin@example.com [--first-name Admin] [--last-name User]
// The password is read from AP_ADMIN_PASSWORD only, so it never shows in the process list.
const path = require('path')
const { parseArgs } = require('util')

const apiPackage = path.resolve(__dirname, '../packages/server/api')
const api = (file) => require(path.resolve(apiPackage, 'dist/src/app', file))
// The image links workspace packages per package, not in the root node_modules, so resolve them from the API package.
const apiDependency = (name) => require(require.resolve(name, { paths: [apiPackage] }))

const main = async () => {
    const { values } = parseArgs({
        options: {
            'email': { type: 'string' },
            'first-name': { type: 'string', default: 'Admin' },
            'last-name': { type: 'string', default: 'User' },
        },
    })
    const email = values.email
    const password = process.env.AP_ADMIN_PASSWORD
    if (!email || !password) {
        throw new Error('--email and the AP_ADMIN_PASSWORD environment variable are required')
    }

    const { UserIdentityProvider } = apiDependency('@activepieces/shared')
    const { system } = api('helper/system/system')
    const { databaseConnection } = api('database/database-connection')
    const { authenticationService } = api('authentication/authentication.service')
    const { platformService } = api('platform/platform.service')

    const log = system.globalLogger()
    await databaseConnection().initialize()

    // A sign-up without a platform id always creates a new platform, so stop when one exists.
    if (await platformService(log).getOldestPlatform()) {
        log.info('[createAdmin] Skipping, a platform already exists')
        return
    }

    await authenticationService(log).signUp({
        email,
        password,
        firstName: values['first-name'],
        lastName: values['last-name'],
        trackEvents: false,
        newsLetter: false,
        platformId: null,
        provider: UserIdentityProvider.EMAIL,
    })
    log.info({ email }, '[createAdmin] Admin, platform and personal project created')
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('[createAdmin] Failed', err)
        process.exit(1)
    })
