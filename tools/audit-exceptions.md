# Exceptions temporaires de l audit des dependances

Les deux exceptions ci-dessous ne concernent que des findings `dev: true` et les chemins complets enumeres dans `audit-policy-paths.json`, issus du rapport de reference PORT-CI-001B : toute version, severite, portee ou tout chemin supplementaire bloque la CI.

- `GHSA-fc5q-39xc-vjpf` : picomatch 4.0.7, severite high. Risque de deni de service lors du traitement de motifs et de chaines adverses. Decision utilisateur PORT-CI-001C ; reexaminer des la publication d un correctif officiel compatible.
- `GHSA-g3hv-75wg-m249` : minimatch 10.2.5, severite moderate. Decision CTO PORT-RELEASE-001D : dependance de developpement uniquement, sans traitement expose de motifs non fiables ; reexaminer des la publication d un correctif compatible.

Ces autorisations expirent a la fin du 17 decembre 2026 UTC : a partir du 18 decembre 2026 00:00:00 UTC, un avis toujours present bloque le controle. La reference historique pour minimatch est `PORT-RELEASE-001D/rapport-technique.md`, qui fixe un reexamen au plus tard le 17 decembre 2026.

Les audits de production et complet restent distincts. Tout avis de production, avis non autorise, rapport incomplet ou incoherent, collecte echouee ou chemin non repertorie bloque. Les exceptions ne constituent pas une garantie pour un code de CI modifie par une contribution non fiable ; limiter les permissions et secrets du projet reste necessaire.
