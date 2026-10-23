# Parcours iPhone réels (BrowserStack)

Lancé depuis la racine : `pnpm test:ios` (identifiants dans `.env`, voir `.env.example`).
Les appareils se règlent dans `browserstack.yml`. Ce dossier est un projet isolé car
BrowserStack n'accepte pas encore le Playwright du dépôt : voir sa liste des versions
prises en charge avant de l'aligner.
