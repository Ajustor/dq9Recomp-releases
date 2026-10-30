# CI du dépôt public

Ce dossier est le contenu à copier à la racine d'un dépôt **public** (par exemple `Ajustor/dq9Recomp-releases`).
Sa CI (`.github/workflows/release.yml`) clone ce dépôt privé, compile `dq9-runtime` et `dq9-extract`
pour Windows et Linux, l'APK Android (`dq9-android` et le projet `android/`), et publie une version
sur le dépôt public à chaque étiquette `v*`.
Rangé ici, sous `ci-public/`, le workflow n'est jamais exécuté par GitHub dans le dépôt privé.

## Mise en place

1. Créer le dépôt public et y copier le contenu de ce dossier (`.github/` compris).
2. Créer une paire de clés pour la CI :
   ```sh
   ssh-keygen -t ed25519 -C "ci dq9Recomp public" -f deploy_key -N ""
   ```
3. Dans le dépôt **privé** : *Settings → Deploy keys → Add deploy key*, coller `deploy_key.pub`,
   **sans** cocher « Allow write access ».
4. Dans le dépôt **public** : *Settings → Secrets and variables → Actions → New repository secret*,
   nom `PRIVATE_REPO_SSH_KEY`, valeur : le contenu de `deploy_key` (la clé privée).
5. Supprimer `deploy_key` et `deploy_key.pub` de la machine.
6. Pour Android, créer **une fois pour toutes** la clé de signature de l'APK (elle ne doit jamais
   changer : sinon les mises à jour demandent de désinstaller le jeu, et donc de perdre les
   journaux) :
   ```sh
   keytool -genkeypair -v -keystore dq9.keystore -alias dq9 -keyalg RSA -keysize 4096 -validity 36500
   base64 -w0 dq9.keystore > dq9.keystore.b64
   ```
   puis, dans les secrets du dépôt **public** : `ANDROID_KEYSTORE_B64` (le contenu de
   `dq9.keystore.b64`), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` (`dq9`) et
   `ANDROID_KEY_PASSWORD`. Garder `dq9.keystore` en lieu sûr, hors des dépôts. Sans ces secrets,
   l'APK est signé avec une clé de débogage jetable (un avertissement le signale dans le run).

## Publier une version

Dans le dépôt public :

```sh
git tag v0.1.0 && git push origin v0.1.0
```

Le commit compilé dans le dépôt privé est l'étiquette du même nom si elle existe (`v0.1.0`), sinon
`master`. Étiqueter les deux dépôts du même nom rend donc chaque version reproductible.
*Actions → release → Run workflow* compile une branche, une étiquette ou un commit au choix, sans
publier de version (les paquets restent en artefacts du run).

## Ce qui est public

- Les **journaux** des runs : ils ne montrent que la compilation, pas le code. Les tests restent
  dans la CI du dépôt privé (`.github/workflows/build.yml`).
- Les **versions** : les exécutables compilés, `config/rom.json`, `config/progress.json`, le README
  et l'APK Android (`dq9recomp-android-arm64.apk`).
  Aucune donnée de la ROM n'y est incluse.
- Les **PR de forks** n'ont pas accès au secret, et ce workflow ne se lance de toute façon que sur
  une étiquette ou à la main.
