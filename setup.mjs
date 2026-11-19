import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const run = (cmd) => {
    console.log(`\n> Ejecutando: ${cmd}`);
    execSync(cmd, { stdio: 'inherit' });
};

console.log("Iniciando la construcción del Monorepo...");

// 1. Crear estructura de carpetas
const dirs = [
    'nginx',
    'http-requests',
    'storage/avatars',
    'storage/classroom-drive',
    'storage/submissions',
    'storage/repository'
];
dirs.forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

// 2. Generar package.json raíz para habilitar Workspaces antes de instalar nada
const rootPkg = {
    name: "uni-platform-monorepo",
    version: "1.0.0",
    private: true,
    workspaces: ["backend", "frontend"],
    scripts: {
        "dev:backend": "npm --workspace=backend run start:dev",
        "dev:frontend": "npm --workspace=frontend run dev",
        "build:all": "npm --workspace=backend run build && npm --workspace=frontend run build",
        "prisma:generate": "npm --workspace=backend run prisma:generate",
        "prisma:migrate": "npm --workspace=backend run prisma:migrate",
        "prisma:seed": "npm --workspace=backend run prisma:seed",
        "prisma:studio": "npm --workspace=backend run prisma:studio",
        "docker:up": "docker compose up -d --build",
        "docker:down": "docker compose down"
    }
};
fs.writeFileSync('package.json', JSON.stringify(rootPkg, null, 2));

// 3. Crear archivos de configuración vacíos en la raíz
const files = ['docker-compose.yml', '.env.example', '.env', 'nginx/nginx.conf'];
files.forEach(f => { if (!fs.existsSync(f)) fs.writeFileSync(f, ''); });

// 4. Instalar Backend (NestJS) y Frontend (Next.js)
if (!fs.existsSync('backend')) {
    run('npx @nestjs/cli new backend --package-manager npm --skip-git --strict');
}
if (!fs.existsSync('frontend')) {
    run('npx create-next-app@14 frontend --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-git');
}

// 5. Instalar y configurar Prisma en Backend
console.log("\n> Configurando Prisma y Dockerfiles...");
run('npm install --workspace=backend prisma @prisma/client --save-dev');
run('npm install --workspace=backend @prisma/client');

if (!fs.existsSync('backend/prisma')) {
    run('npx --workspace=backend prisma init');
}

// 6. Modificar package.json del backend para agregar scripts de Prisma
const backendPkgPath = path.join('backend', 'package.json');
const backendPkg = JSON.parse(fs.readFileSync(backendPkgPath, 'utf8'));
backendPkg.scripts = {
    ...backendPkg.scripts,
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:seed": "ts-node prisma/seed.ts",
    "prisma:studio": "prisma studio"
};
fs.writeFileSync(backendPkgPath, JSON.stringify(backendPkg, null, 2));

// 7. Crear Dockerfiles vacíos
fs.writeFileSync('backend/Dockerfile', '');
fs.writeFileSync('frontend/Dockerfile', '');

console.log("\n✅ Estructura base generada. Abre el proyecto en WebStorm y pega el código correspondiente.");