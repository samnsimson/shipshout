/// <reference types="bun" />
import inquirer from 'inquirer';

type ResourceKind = 'app' | 'library';
type AppKind = 'Next.js' | 'Nest.js';
type LibraryKind = 'Nest.js' | 'JavaScript';

async function runCommand(args: string[]) {
    const proc = Bun.spawn(args, { stdout: 'inherit', stderr: 'inherit', stdin: 'inherit' });
    const exitCode = await proc.exited;
    if (exitCode !== 0) process.exit(exitCode);
}

async function generateNextApp(name: string) {
    await runCommand([
        'bun',
        'nx',
        'generate',
        '@nx/next:application',
        `--directory=apps/${name}`,
        '--linter=eslint',
        `--name=${name}`,
        '--unitTestRunner=jest',
        '--useProjectJson=true',
        '--no-interactive',
    ]);
}

async function generateNestApp(name: string) {
    await runCommand([
        'bun',
        'nx',
        'generate',
        '@nx/nest:application',
        `--directory=apps/${name}`,
        '--linter=eslint',
        `--name=${name}`,
        '--unitTestRunner=jest',
        '--e2eTestRunner=jest',
        '--tags=type:app',
        '--useProjectJson=true',
        '--no-interactive',
    ]);
}

async function generateNestLibrary(name: string) {
    await runCommand([
        'bun',
        'nx',
        'generate',
        '@nx/nest:library',
        `--directory=libs/${name}`,
        '--buildable=true',
        '--unitTestRunner=jest',
        '--global=true',
        `--importPath=@shipshout/${name}`,
        `--name=${name}`,
        '--useProjectJson=true',
        '--no-interactive',
    ]);
}

async function generateJavaScriptLibrary(name: string) {
    await runCommand([
        'bun',
        'nx',
        'generate',
        '@nx/js:library',
        `--directory=libs/${name}`,
        '--buildable=true',
        '--unitTestRunner=jest',
        `--importPath=@shipshout/${name}`,
        `--name=${name}`,
        '--useProjectJson=true',
        '--no-interactive',
    ]);
}

async function promptResourceKind(): Promise<ResourceKind> {
    const type = 'select';
    const name = 'resource';
    const choices = ['app', 'library'];
    const message = 'What type of resource do you want to generate?';
    const { resource } = await inquirer.prompt<{ resource: ResourceKind }>({ type, name, choices, message });
    return resource;
}

async function promptAppKind(): Promise<AppKind> {
    const type = 'select';
    const name = 'type';
    const choices = ['Next.js', 'Nest.js'];
    const message = 'Next.js or Nest.js?';
    const { type: appType } = await inquirer.prompt<{ type: AppKind }>({ type, name, choices, message });
    return appType;
}

async function promptLibraryKind(): Promise<LibraryKind> {
    const type = 'select';
    const name = 'type';
    const choices = ['Nest.js', 'JavaScript'];
    const message = 'Nest.js or JavaScript?';
    const { type: libraryType } = await inquirer.prompt<{ type: LibraryKind }>({ type, name, choices, message });
    return libraryType;
}

async function promptLibraryName(): Promise<string> {
    const type = 'input';
    const name = 'name';
    const message = 'Library name?';
    const validate = (value: string) => (value.trim() ? true : 'Name is required');
    const { name: libraryName } = await inquirer.prompt<{ name: string }>({ type, name, message, validate });
    return libraryName.trim();
}

async function promptAppName(): Promise<string> {
    const type = 'input';
    const name = 'name';
    const message = 'App name?';
    const validate = (value: string) => (value.trim() ? true : 'Name is required');
    const { name: appName } = await inquirer.prompt<{ name: string }>({ type, name, message, validate });
    return appName.trim();
}

async function handleNextApp() {
    const appName = await promptAppName();
    await generateNextApp(appName);
}

async function handleNestApp() {
    const appName = await promptAppName();
    await generateNestApp(appName);
}

async function handleApp() {
    const kind = await promptAppKind();
    if (kind === 'Next.js') return handleNextApp();
    return handleNestApp();
}

async function handleNestLibrary() {
    const libraryName = await promptLibraryName();
    await generateNestLibrary(libraryName);
}

async function handleJavaScriptLibrary() {
    const libraryName = await promptLibraryName();
    await generateJavaScriptLibrary(libraryName);
}

async function handleLibrary() {
    const kind = await promptLibraryKind();
    if (kind === 'Nest.js') return handleNestLibrary();
    return handleJavaScriptLibrary();
}

async function main() {
    const resource = await promptResourceKind();
    if (resource === 'app') return handleApp();
    return handleLibrary();
}

main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
});
