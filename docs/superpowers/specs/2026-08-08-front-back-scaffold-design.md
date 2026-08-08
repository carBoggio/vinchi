# Scaffold: front/ + back/ para el proyecto Midnight

Fecha: 2026-08-08

## Contexto

El directorio `/home/car/projects/midnight` está vacío (solo un `readme.md` en blanco). No es un repo git. Memoria de sesiones previas describía una arquitectura anterior (Vinchi, modelo de notas, circuito `deposit`) que ya no existe en disco — se descarta como contexto para este trabajo; este scaffold arranca de cero.

Objetivo: separar el proyecto en `front/` y `back/`, con las dependencias del ecosistema Midnight instaladas donde corresponde, de forma que:
- `back/` se levanta completo con un solo `docker compose up` (compose file vive en `back/`).
- `front/` se levanta completo con `npm run dev` (npm, no yarn/pnpm).
- `back/contracts/` contiene los contratos Compact y las dependencias npm necesarias para compilarlos y desplegarlos.

## Decisiones

- **Sin workspaces compartidos**: `front/` y `back/contracts/` son proyectos npm independientes, cada uno con su propio `package.json` e instalación. Se prioriza que cada mitad se levante con su propio comando único, tal como pidió el usuario.
- **Sin arquitectura previa**: no se recrea el modelo de notas/circuito `deposit` de la memoria de sesiones pasadas. El contrato de ejemplo es un contador Compact mínimo, sin relación con el dominio de pagos privados.
- **Backend = solo infraestructura Midnight + contratos**: no hay servidor de aplicación propio (API) en esta fase. El `back` es la red local de Midnight (node + indexer + proof-server) y la carpeta de contratos. El front hablaría directo con la red local / wallet.
- **Versiones pineadas**: se usa el set de versiones "known-good" documentado oficialmente (`@midnight-ntwrk/midnight-js-*@4.1.1`, `wallet-sdk@1.0.0`, `compact-runtime@^0.16.0`) en vez de dejar que npm resuelva `latest`, siguiendo la recomendación explícita de la documentación de Midnight.
- **`back/contracts/` se genera con `create-mn-app`, no a mano**: `create-mn-app` es la CLI oficial de Midnight (`npx create-mn-app`) para scaffolding de contratos — ya resuelve el wiring de wallet/providers/deploy contra la red local (`hello-world` template, con devnet local incluida) con versiones compatibles entre sí. Escribir ese wiring a mano a partir de fragmentos de distintos repos de ejemplo tiene más riesgo de bugs sutiles de versión que usar la herramienta mantenida oficialmente. Después de generarlo, se reorganiza el resultado para que el `docker-compose.yml` quede en `back/` (no anidado en `back/contracts/`), respetando la estructura ya acordada.

## Estructura de archivos

```
midnight/
├── front/
│   ├── package.json          # vite + react + react-dom + dapp-connector-api
│   ├── vite.config.ts
│   ├── index.html
│   ├── tsconfig.json
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       └── selectWallet.ts   # conector mínimo de wallet Lace (DApp Connector API)
│
└── back/
    ├── docker-compose.yml    # node + indexer + proof-server (red 'undeployed') — movido acá tras generar contracts/
    └── contracts/
        ├── package.json      # generado por create-mn-app: scripts de compile/deploy
        ├── contracts/
        │   └── hello-world.compact   # contrato de ejemplo (template oficial)
        └── src/
            ├── deploy.ts     # generado: wiring de providers + deploy contra la red local
            ├── cli.ts        # generado: interactuar con el contrato ya desplegado
            └── check-balance.ts
```

## `back/docker-compose.yml`

Se genera junto con el resto de `back/contracts/` al correr `create-mn-app` (ver abajo) y luego se mueve a `back/docker-compose.yml`, para que un solo `docker compose up` ejecutado dentro de `back/` levante la red local completa (node + indexer + proof-server, red `undeployed`). Si algún script de `back/contracts/package.json` invoca `docker compose` asumiendo que el archivo está al lado, se ajusta ese script para apuntar a `../docker-compose.yml` tras el movimiento.

## `back/contracts/`

Se genera con la CLI oficial `create-mn-app`, seleccionando el tipo **Contract** y el template **hello-world** (el único que trae devnet local embebida y soporta `--network`), apuntado a la red `undeployed`:

```bash
npx create-mn-app@latest contracts --template hello-world --network undeployed -y --use-npm --skip-git
```

Esto genera, con versiones internamente consistentes ya resueltas por la herramienta:

- **Contrato de ejemplo** (`contracts/hello-world.compact`): contrato mínimo de almacenamiento de mensaje (`storeMessage`), sin estado privado, para validar el pipeline compile → deploy de punta a punta sin acoplarlo a ningún dominio de negocio.
- **`package.json`** con las dependencias de deploy (`@midnight-ntwrk/midnight-js-*`, `wallet-sdk`, `testkit-js`, etc.) y scripts de compile/deploy ya cableados por la herramienta.
- **`src/deploy.ts`**: arma los providers (indexer, proof, zk-config, private-state), usa una wallet pre-generada/fondeada contra la red local, despliega el contrato y confirma que el flujo completo funciona.
- **`src/cli.ts`** / **`src/check-balance.ts`**: utilidades generadas para interactuar con el contrato ya desplegado y revisar el balance de la wallet.

`--skip-git` evita que la herramienta inicialice un repo git anidado dentro de `back/contracts/` (el repo ya existe en la raíz). `-y --use-npm` fuerzan modo no interactivo con npm como package manager, cumpliendo el requisito de usar npm.

## `front/`

- Scaffold estándar: `npm create vite@latest . -- --template react-ts`.
- `package.json` con `"dev": "vite"` → se corre como `npm run dev`.
- Dependencia agregada: `@midnight-ntwrk/dapp-connector-api`, para un conector de wallet mínimo (`selectWallet.ts`) que sigue el patrón oficial: lee `window.midnight`, conecta con `connect('undeployed')`, expone estado de conexión y dirección. Sin lógica de negocio ni llamadas a contratos todavía — solo la base de conexión a wallet, dado que el back no expone una API propia en esta fase.

## Fuera de alcance (explícito)

- No hay servidor de aplicación/API backend propio.
- No se reconstruye el modelo de notas / circuito `deposit` de la arquitectura Vinchi anterior.
- No hay CI/CD, tests automatizados, ni despliegue a Preprod/Mainnet — solo la red local `undeployed`.
- No hay un `package.json` raíz ni npm workspaces uniendo `front/` y `back/contracts/`.
