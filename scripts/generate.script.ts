/// <reference types="bun" />
import inquirer from 'inquirer';

type ResourceKind = 'app' | 'library';
type LibraryKind = 'Nest.js' | 'JavaScript';

async function runCommand(args: string[]) {
    const proc = Bun.spawn(args, { stdout: 'inherit', stderr: 'inherit', stdin: 'inherit' });
    const exitCode = await proc.exited;
    if (exitCode !== 0) process.exit(exitCode);
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

async function handleApp() {
    const type = 'input';
    const name = 'name';
    const message = 'App name?';
    const validate = (value: string) => (value.trim() ? true : 'Name is required');
    const { name: appName } = await inquirer.prompt<{ name: string }>({ type, name, message, validate });
    return appName.trim();
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
