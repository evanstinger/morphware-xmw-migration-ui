# Plan: Replace Migration Flow with Revert Migration Flow

## 1) Baseline and dependency audit
- Confirm all migration-related touchpoints across app, composables, config, metadata, and docs.
- Keep architecture unchanged (single-page dApp), only swap contract integration + UI semantics.
- Preserve existing safety patterns for amount handling (string input, decimal validation, parseUnits at submit time).

## 2) Add new runtime config surface for revert contract
- In `nuxt.config.ts`, introduce `public.migrationRevertContractAddress` sourced from `NUXT_PUBLIC_MIGRATION_REVERT_CONTRACT_ADDRESS`.
- Keep existing `chainId` and other runtime config untouched.
- Update `.env.example` to include the new variable and clear usage comment.
- Decide compatibility strategy:
  - Preferred: use only `migrationRevertContractAddress` in app code.
  - Optional temporary fallback in composable (`migrationRevertContractAddress || migrationContractAddress`) only if needed for rollout.

## 3) Replace contract composable with revert version
- Replace `app/composables/useMigrationContract.ts` with revert-contract ABI and API (or create `useMigrationRevertContract.ts` and migrate imports, then remove old usage).
- ABI must match `MorphwareRevert.sol`:
  - write: `revertMigration(uint256)`
  - read: `getRevertMetrics(address)` returning:
    - `userReverted`
    - `userOldTokenBalance`
    - `userNewTokenBalance`
    - `contractOldTokenBalance`
    - `contractNewTokenBalance`
    - `totalReverted`
    - `decimals`
  - reads: `oldToken()`, `newToken()`, `paused()`, `tokenDecimals()`, `totalReverted()`, `userReverted(address)`
  - event: `MigrationReverted(address,uint256)` (optional for future listener parity)
- Export typed `RevertMetrics` interface aligned to the tuple fields above.
- Expose composable methods:
  - `getRevertMetrics(userAddress)`
  - `revertMigration(amount)`
  - `getOldTokenAddress()`, `getNewTokenAddress()`, `getPaused()`
  - ERC20 helpers for allowance/approve checks.
- Preserve chain behavior `preferWalletRead: chainId === 1`.

## 4) Rework page logic from migrate -> revert
- In `app/pages/index.vue`, switch contract instance and all method calls to revert composable API.
- Flip approval/allowance token side:
  - Previous migration approved/spent old token.
  - Revert flow must approve/spend new token for `revertMigration`.
- Flip amount validation and max rules:
  - Use `metrics.userNewTokenBalance` for input bounds and submit eligibility.
- Rename local state/computed/actions for clarity:
  - `migrateAmount` -> `revertAmount`
  - `isMigrating` -> `isReverting`
  - `migrateTokens` -> `revertTokens`
  - `canMigrate`/`canSubmitMigrate` -> revert equivalents.
- Update error mapping to contract-specific custom errors surfaced by provider:
  - `ZeroAmount`
  - `InsufficientBalance`
  - `InsufficientContractBalance`
  - `AmountMismatch`
  - paused-state handling remains.
- Keep transaction flow pattern unchanged:
  - validate input -> ensure allowance -> send tx -> wait -> refresh balances/metrics -> toast.

## 5) Rework UI copy + metrics semantics
- Update hero/status copy to explain cancellation of migration and availability of 1:1 revert.
- Replace all user-facing labels/actions:
  - “Migration” -> “Revert” phrasing where appropriate.
  - CTA/buttons/loading/toasts to revert wording.
- Update metric cards to match new semantics:
  - “You Reverted”, “Total Reverted”
  - Include both contract old/new balances where useful for transparency.
- Ensure contract address display and explorer links reference revert contract runtime key.

## 6) Update app metadata and wallet metadata
- Update `app/app.vue` SEO title/description/OG/Twitter copy to revert narrative.
- Update `app/config/metadata.ts` wallet metadata name/description accordingly.
- Keep branding assets unchanged unless explicitly required.

## 7) Sweep remaining migration references
- Run repo-wide reference pass to remove stale migration-only labels/identifiers in app code.
- Decide scope for non-functional identifiers:
  - `README.md` title update to reflect revert app purpose.
  - `package.json` name can remain for continuity unless user wants rename.
- Do not change lockfile unless dependency graph changes.

## 8) Verification checklist before handoff
- Typecheck/lint and run app build.
- Manual happy-path validation:
  - connected wallet on configured chain
  - fetch metrics succeeds
  - approve new token succeeds
  - `revertMigration` tx succeeds
  - post-tx metrics refresh reflects reverted amounts
- Manual failure-path validation:
  - zero amount blocked in UI
  - over-balance amount blocked
  - paused contract disables action with clear message
  - insufficient contract old-token liquidity error shown.
- Confirm no remaining broken imports/usages after composable rename.

## 9) Delivery format
- Provide concise change summary grouped by:
  - contract integration
  - runtime/env
  - page logic
  - copy/metadata
  - verification results
- Include direct file links and line ranges for key edits.
