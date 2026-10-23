# Élan — mon carnet sport

Petite application web (PWA) pour planifier ses séances de sport, les cocher, suivre ses programmes
et débloquer des récompenses. **Tout est enregistré sur le téléphone** (stockage du navigateur) :
rien ne part sur internet. Le bouton « Sauvegarder » (roue crantée) sort un fichier `.json`
qu'on peut garder ou restaurer.

## Les 4 onglets

- **Ma semaine** : les séances prévues de la semaine, à cocher. Une séance faite en plus se
  note avec « J'ai fait une autre séance ». Une semaine est *complète* quand on a fait au moins
  autant de séances que prévu (ou l'objectif par défaut si rien n'est prévu).
- **Planning** : la *semaine type* (répétée chaque semaine) et, si besoin, une semaine précise
  modifiée à part. Les semaines passées sont figées : changer la semaine type ne réécrit pas
  l'historique.
- **Programmes** : programmes notés à la main, idées toutes prêtes, et le **générateur**
  (objectif, niveau, activités aimées, zones, lieu, matériel, précautions, séances par semaine,
  durée, nombre de semaines, jours préférés, échauffement). Un programme se place dans la
  semaine type en un geste.
- **Récompenses** : série de semaines complètes 🔥, jokers 🃏 (1 toutes les 4 semaines
  complètes, pour une semaine off sans casser la série), badges, recettes, exercices bonus et
  thèmes de couleurs à débloquer.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | la page et sa mise en forme |
| `app.js` | toute la logique |
| `donnees.js` | contenus : exercices, recettes, exercices bonus, thèmes, paliers |
| `sw.js` | fonctionnement hors connexion + bandeau « nouvelle version » |
| `manifest.webmanifest`, `icon-192.png`, `icon-512.png` | installation sur l'écran d'accueil |
| `_icones.py` | régénère les icônes (`python _icones.py`) — ne pas mettre en ligne |
| `serve.py` | serveur de test local (port 4250) — ne pas mettre en ligne |

## À chaque nouvelle version

Changer **ensemble** `VERSION` dans `sw.js` et les `?v=` de `donnees.js` / `app.js` dans
`index.html` (et `VERSION` en haut de `app.js`). Sinon le téléphone garde l'ancienne version.

## Mise en ligne (GitHub Pages)

Dépôt public sur le compte perso, Pages sur `main` / racine. Fichiers à déposer :
`index.html`, `app.js`, `donnees.js`, `sw.js`, `manifest.webmanifest`, `icon-192.png`, `icon-512.png`.

Le programme généré est indicatif : en cas de douleur, de reprise après blessure ou de souci de
santé, demander l'avis d'un médecin.
