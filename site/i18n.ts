import { i18n } from '@ajustor/speedster/build'

/**
 * Compile `src/lang/*.json` en modules typés (`src/lang/index.ts`, alias `$messages`).
 * Le français est la langue de référence : une clé qui manque dans une autre langue
 * arrête le build.
 */
export async function compilerLangues(): Promise<boolean> {
  const messages = await i18n.compileProject({
    source: 'src/lang',
    out: 'src/lang',
    defaultLocale: 'fr',
    runtimeModule: '@ajustor/speedster',
  })

  for (const probleme of messages.diagnostics) {
    console.error(`  ${probleme.severity} ${probleme.locale} ${probleme.key} — ${probleme.message}`)
  }
  return !messages.hasErrors
}

// Utilisable seul : `bun run i18n`.
if (import.meta.main) process.exit((await compilerLangues()) ? 0 : 1)
