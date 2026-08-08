# Rediseño visual: header fijo + pestañas de las 4 operaciones

## Objetivo

Reorganizar la UI existente en pestañas, sin tocar ninguna función, call, variable,
state o texto de display que ya exista. Es un cambio de posición de cajas, más
dos formularios nuevos simulados para las operaciones que todavía no tienen
frontend (materialize, withdraw).

## Alcance

**No se toca:**
- `send_deposit.tsx` (lógica de `send_deposit` y `DepositForm` internos)
- `send_pay.tsx` (lógica de `send_pay` y `PayForm` internos)
- `get_notes.tsx` (lógica de `get_notes`, `NotesView`, `NotesList`)
- Cualquier archivo bajo `src/midnight/`

Estos componentes se **mueven de lugar** (quedan renderizados dentro de una
pestaña en vez de apilados uno debajo del otro), pero su JSX interno, sus
imports, sus estados y sus llamadas a funciones quedan intactos carácter por
carácter.

**Se agrega:**
- `WalletHeader` — franja fija arriba de las pestañas.
- `Tabs` — barra de pestañas genérica y reusable.
- `MaterializeForm` (mock) y `WithdrawForm` (mock) — mismo patrón visual que
  `DepositForm`/`PayForm`, pero simulan el resultado (sin contrato real)
  porque esos circuitos no tienen wrapper de frontend todavía. Marcados
  explícitamente como mock en el código.

## Componentes

### `WalletHeader`

Reemplaza el bloque actual de connect/disconnect en `App.tsx` (mismas
funciones `handleConnect`/`handleDisconnect`, mismo estado
`isConnected`/`walletAddress`/`error`, solo remaquetados). Agrega, siempre
visible sin importar la pestaña activa:

- Balance total spendable: llama a `get_notes()` (ya exportada por
  `get_notes.tsx`) y reduce con `spendableNotes()` +
  `totalSpendableLusdv()` (ya exportadas por `midnight/notes.ts`) en su
  propio `useEffect` — un fetch independiente del que hace `NotesView`
  dentro de su pestaña. No se modifica ninguna de esas funciones.
- Address: el mismo valor `walletAddress` que ya vive en `App.tsx`.

### `Tabs`

Componente de pestañas simple (lista de labels + contenido activo), sin
librería externa. Pestañas, en este orden:

1. **Notes** — contenido: `<NotesView />` sin cambios.
2. **Deposit** — contenido: `<DepositForm />` sin cambios.
3. **Pay** — contenido: `<PayForm />` sin cambios.
4. **Materialize** — contenido: `<MaterializeForm />` (nuevo, mock).
5. **Withdraw** — contenido: `<WithdrawForm />` (nuevo, mock).

### `MaterializeForm` / `WithdrawForm` (mock)

Mismo patrón de estado que `DepositForm` (`idle | pending | success | error`),
pero el submit no llama a ningún contrato: espera un `setTimeout` corto y
resuelve con un txId/blockHeight inventados. Comentario explícito en el
código señalando que es un mock pendiente de conectar a
`deployed.callTx.materialize` / `deployed.callTx.redeem` cuando exista el
wrapper real.

## Estilo

Se usa la skill `frontend-design` para la maquetación (tabs, tarjetas,
espaciado), reutilizando las variables CSS que ya existen en `index.css`
(`--accent`, `--border`, `--bg`, `--text`, soporte light/dark ya armado).
No se introduce un sistema de diseño paralelo ni se cambian esas variables.

## Fuera de alcance

- Conectar Materialize/Withdraw a los circuitos reales del contrato.
- Cualquier cambio de copy/texto en los componentes existentes.
- Cambios de dependencias.
