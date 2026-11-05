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
   Sous Windows (PowerShell ; `keytool` vient du JDK, par exemple
   `C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe`) :
   ```powershell
   keytool -genkeypair -v -keystore dq9.keystore -alias dq9 -keyalg RSA -keysize 4096 -validity 36500
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("$PWD\dq9.keystore")) | Set-Content -NoNewline dq9.keystore.b64
   ```
   puis, dans les secrets du dépôt **public** : `ANDROID_KEYSTORE_B64` (le contenu de
   `dq9.keystore.b64`), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` (`dq9`) et
   `ANDROID_KEY_PASSWORD`. Garder `dq9.keystore` en lieu sûr, hors des dépôts. Sans ces secrets,
   **aucune version n'est publiée** (le job Android échoue) : un APK signé avec la clé de débogage
   du dépôt est bloqué comme dangereux par Play Protect, et passer ensuite à la vraie clé oblige
   à désinstaller le jeu (donc à perdre ses journaux). Une compilation manuelle (*Run workflow*,
   sans version) reste possible avec la clé de débogage, en artefact seulement.

## Publier une version

### À chaque merge sur master (automatique)

La CI du dépôt privé (job `publish` de `.github/workflows/build.yml`) demande au dépôt public de
compiler le commit fusionné et de publier la version `<x.y>.<build>` (`x.y` : la version du `Cargo.toml` du workspace, `0.4`
aujourd'hui), où `<build>` est le nombre de
commits (le `versionCode` de l'APK). Le lanceur des joueurs la propose alors en mise à jour.

Mise en place, une fois : créer un jeton à grain fin (*GitHub → Settings → Developer settings →
Fine-grained tokens*) limité au dépôt public, avec le droit **Contents : Read and write**, et
l'ajouter dans les secrets du dépôt **privé** sous le nom `RELEASES_TOKEN`. Sans lui, le job
`publish` ne fait rien.

### Par étiquette

Dans le dépôt public :

```sh
git tag v0.1.0 && git push origin v0.1.0
```

Le commit compilé dans le dépôt privé est l'étiquette du même nom si elle existe (`v0.1.0`), sinon
`master`. Étiqueter les deux dépôts du même nom rend donc chaque version reproductible.
*Actions → release → Run workflow* compile une branche, une étiquette ou un commit au choix, sans
publier de version (les paquets restent en artefacts du run).

## Mises à jour du jeu

Chaque version porte, à côté de ses paquets, un `version.json` (`{"version", "build", "commit"}`).
Le lanceur (`crates/dq9-launcher/src/update.rs`) lit la dernière version publiée et la propose
quand son `build` dépasse le sien :

- sur PC, il télécharge le paquet de son système et le déballe par-dessus le dossier du jeu, puis
  redémarre (une version compilée depuis les sources se met à jour avec git) ;
- sur Android, il ouvre le lien de l'APK dans le navigateur, qui le télécharge ; le joueur
  l'installe depuis la notification (le jeu ne demande pas la permission d'installer des
  applications, que Play Protect juge dangereuse). La mise à jour ne passe que
  si l'APK installé est signé de la **même clé** (`ANDROID_KEYSTORE_B64`) : un APK de la CI
  privée (clé de débogage) doit être désinstallé une fois avant de passer aux versions publiques.

La recherche se fait au démarrage (désactivable dans les réglages) ou à la demande
(*Réglages → Rechercher une mise à jour*).

## Ce qui est public

- Les **journaux** des runs : ils ne montrent que la compilation, pas le code. Les tests restent
  dans la CI du dépôt privé (`.github/workflows/build.yml`).
- Les **versions** : les exécutables compilés, `config/rom.json`, `config/progress.json`, le README
  et l'APK Android (`dq9recomp-android-arm64.apk`).
  Aucune donnée de la ROM n'y est incluse.
- Les **PR de forks** n'ont pas accès au secret, et ce workflow ne se lance de toute façon que sur
  une étiquette ou à la main.

## Site vitrine

`site/` est la page de téléchargement, écrite avec [speedster-js](https://github.com/Ajustor/speedster-js)
et publiée sur GitHub Pages par `.github/workflows/pages.yml` à chaque envoi sur master qui touche
`site/` (*Settings → Pages → Source : GitHub Actions*). La page est rendue au build en HTML
statique : les liens `releases/latest/download/…` marchent sans JavaScript, et le navigateur
complète le système détecté, le numéro de la dernière version et la taille des paquets (API de
GitHub). Une nouvelle version n'a donc pas besoin de republier le site ; seul l'avancement se met à jour à la main :
recopier `config/progress.json` du dépôt privé dans `site/src/progress.json`.

Le site est en français (`/`) et en anglais (`/en/`) : une page rendue au build par langue, avec
ses liens `hreflang`. Les textes sont dans `site/src/lang/fr.json` (la référence) et `en.json` ;
une clé absente d'une langue arrête le build. Ajouter une langue : un `<code>.json` de plus et une
entrée dans `LOCALES` (`site/src/data.ts`). Le détail de l'avancement reste en français, comme
dans le lanceur.

Organisation de `site/src/` : `App.spd` assemble la page ; `sections/home/` contient ses sections
(Hero, Download, Install, Progress, Faq), chacune avec son style ; `components/` contient ce qui
est partagé (Window, Section) et le cadre de page (Header, Footer, Sky). Le curseur ▶ des menus
(`.menu-item`), les notes et les couleurs du thème sont dans `site/public/styles.css`.

```sh
cd site && bun install
bun run dev       # http://localhost:3000, reconstruit et recharge à chaque sauvegarde
bun run check     # types et accessibilité
bun run build     # dist/
bun run preview   # sert dist/ comme Pages
```
