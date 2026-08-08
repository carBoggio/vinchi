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
    ├── docker-compose.yml    # node + indexer-standalone + proof-server (red 'undeployed')
    └── contracts/
        ├── package.json      # scripts: compact (compilar), deploy
        ├── tsconfig.json
        ├── counter.compact   # contrato de ejemplo
        └── src/
            ├── config.ts     # endpoints de la red local (undeployed)
            └── deploy.ts     # script de deploy contra la red local
```

## `back/docker-compose.yml`

Tres servicios, red `undeployed`, con healthchecks (`indexer` espera a que `node` esté healthy):

| Servicio | Imagen | Puerto host |
|---|---|---|
| `node` | `midnightntwrk/midnight-node:1.0.0` | `9944` |
| `indexer` | `midnightntwrk/indexer-standalone:4.3.3` | `8088` |
| `proof-server` | `midnightntwrk/proof-server:8.1.0` | `6300` |

Un `docker compose up` (ejecutado dentro de `back/`) levanta las tres. Estos puertos coinciden con lo que la wallet Lace espera en modo "Undeployed", así que no requiere configuración adicional del lado de la wallet.

## `back/contracts/`

- **Contrato de ejemplo** (`counter.compact`): contador público mínimo, sin estado privado ni witnesses, para validar el pipeline compile → deploy de punta a punta sin acoplarlo a ningún dominio de negocio:

  ```compact
  pragma language_version >= 0.16;

  import CompactStandardLibrary;

  export ledger round: Counter;

  export circuit increment(): [] {
    round.increment(1);
  }
  ```

- **Compilador Compact**: se gestiona vía `@midnight-ntwrk/midnight-js-compact` (devDependency), que descarga y administra el binario `compactc` a través de npm scripts (`fetch-compactc` / `run-compactc`), evitando depender de un instalador global fuera de npm.

- **Dependencias de deploy** (pineadas, no rangos `^`/`latest`):
  - `@midnight-ntwrk/compact-runtime` `^0.16.0`
  - `@midnight-ntwrk/midnight-js-contracts` `4.1.1`
  - `@midnight-ntwrk/midnight-js-indexer-public-data-provider` `4.1.1`
  - `@midnight-ntwrk/midnight-js-http-client-proof-provider` `4.1.1`
  - `@midnight-ntwrk/midnight-js-node-zk-config-provider` `4.1.1`
  - `@midnight-ntwrk/midnight-js-level-private-state-provider` `4.1.1`
  - `@midnight-ntwrk/midnight-js-types` `4.1.1`
  - `@midnight-ntwrk/midnight-js-utils` `4.1.1`
  - `@midnight-ntwrk/midnight-js-network-id` `4.1.1`
  - `@midnight-ntwrk/wallet-sdk` `1.0.0`
  - `ws`, `pino`/`pino-pretty` (requeridos por el runtime de indexer/logs)
  - `tsx` (devDependency, para correr `deploy.ts` sin paso de build separado)

- **`src/config.ts`**: endpoints fijos de la red local (`http://127.0.0.1:9944`, `http://127.0.0.1:8088/api/v4/graphql`, `http://127.0.0.1:6300`), `networkId: 'undeployed'`.

- **`src/deploy.ts`**: arma los providers (indexer, proof, zk-config, private-state), usa la wallet génesis de la red local (seed `0x00...001`, ya fondeada por el propio contenedor `node` en modo `dev`), despliega `counter.compact` y llama `increment()` una vez para confirmar que el flujo completo funciona.

## `front/`

- Scaffold estándar: `npm create vite@latest . -- --template react-ts`.
- `package.json` con `"dev": "vite"` → se corre como `npm run dev`.
- Dependencia agregada: `@midnight-ntwrk/dapp-connector-api`, para un conector de wallet mínimo (`selectWallet.ts`) que sigue el patrón oficial: lee `window.midnight`, conecta con `connect('undeployed')`, expone estado de conexión y dirección. Sin lógica de negocio ni llamadas a contratos todavía — solo la base de conexión a wallet, dado que el back no expone una API propia en esta fase.

## Fuera de alcance (explícito)

- No hay servidor de aplicación/API backend propio.
- No se reconstruye el modelo de notas / circuito `deposit` de la arquitectura Vinchi anterior.
- No hay CI/CD, tests automatizados, ni despliegue a Preprod/Mainnet — solo la red local `undeployed`.
- No hay un `package.json` raíz ni npm workspaces uniendo `front/` y `back/contracts/`.
