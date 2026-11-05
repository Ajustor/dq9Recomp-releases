import { i18n } from '@ajustor/speedster/build'

/**
 * Compile `src/lang/*.json` en modules typés (`src/lang/index.ts`, alias `$messages`).
 * Le français est la langue de référence : une clé qui manque dans une autre langue
 * arrête le build.
 */
export async function compileLocales(): Promise<boolean> {
  const messages = await i18n.compileProject({
    source: 'src/lang',
    out: 'src/lang',
    defaultLocale: 'fr',
    runtimeModule: '@ajustor/speedster',
  })

  for (const problem of messages.diagnostics) {
    console.error(`  ${problem.severity} ${problem.locale} ${problem.key} — ${problem.message}`)
  }
  return !messages.hasErrors
}

// Utilisable seul : `bun run i18n`.
if (import.meta.main) process.exit((await compileLocales()) ? 0 : 1)
