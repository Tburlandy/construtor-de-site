import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const templateRoot = path.join(repoRoot, '.export-template', 'current');
const outputDir = path.join(templateRoot, 'site');
const exportBasePlaceholder = '/_PROJECT_BASE_PATH__/';
const defaultContentPath = path.join(repoRoot, 'content', 'content.json');
const viteConfigPath = path.join(repoRoot, 'scripts', 'vite-export.config.mjs');
const viteBinPath = path.join(repoRoot, 'node_modules', 'vite', 'bin', 'vite.js');

async function runCommand(command, args, options = {}) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? repoRoot,
      env: options.env ?? process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      process.stdout.write(chunk);
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      process.stderr.write(chunk);
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr.trim() || `Comando falhou: ${command} ${args.join(' ')}`));
    });
  });
}

async function assertFileExists(filePath, label) {
  try {
    await fs.access(filePath);
  } catch {
    throw new Error(`[build-export-template] ${label} não encontrado em ${filePath}`);
  }
}

async function copyHtaccessIfExists() {
  const sourcePath = path.join(repoRoot, 'public', '.htaccess');
  const targetPath = path.join(outputDir, '.htaccess');

  try {
    await fs.copyFile(sourcePath, targetPath);
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return;
    }
    throw error;
  }
}

async function copyDefaultContent() {
  const targetPath = path.join(outputDir, 'content', 'content.json');
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.copyFile(defaultContentPath, targetPath);
}

async function writeMetadata() {
  const metadataPath = path.join(templateRoot, 'metadata.json');
  const metadata = {
    basePathPlaceholder: exportBasePlaceholder,
    generatedAt: new Date().toISOString(),
  };

  await fs.writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf-8');
}

async function main() {
  await assertFileExists(viteConfigPath, 'Config de export do Vite');
  await assertFileExists(viteBinPath, 'Binário do Vite');
  await assertFileExists(defaultContentPath, 'Conteúdo padrão');

  await fs.rm(templateRoot, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });

  const env = {
    ...process.env,
    PROJECT_ID: 'template',
    VITE_PROJECT_ID: 'template',
    PROJECT_BASE_PATH: exportBasePlaceholder,
    VITE_PROJECT_BASE_PATH: exportBasePlaceholder,
    VITE_STUDIO_ENABLED: 'false',
  };

  await runCommand(
    process.execPath,
    [viteBinPath, 'build', '--config', viteConfigPath, '--outDir', outputDir],
    { cwd: repoRoot, env },
  );

  await copyHtaccessIfExists();
  await copyDefaultContent();
  await writeMetadata();

  console.log(`[build-export-template] Template gerado em ${outputDir}`);
}

main().catch((error) => {
  console.error('[build-export-template] Falha ao gerar template exportável:', error);
  process.exitCode = 1;
});
