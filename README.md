# Terra Testudo — Les Mondes-Dos

**Terra Testudo** est un jeu de construction, d’exploration et de défense jouable dans un navigateur. Le joueur commence avec une petite maison sur le dos d’un tortillon, développe une ville vivante, nourrit la créature qui la porte, puis fait évoluer celle-ci jusqu’à la forme de **tortue-monde elder** capable de soutenir une région entière.

[Jouer à la version de production](https://terra-testudo-les-mondes-dos.vercel.app)

La version 1.1.0 propose une campagne guidée complète, puis un mode libre à objectifs d’héritage. Le projet est autonome : aucun compte, aucune API distante et aucune dépendance de production ne sont nécessaires.

## Lancer le jeu

### Méthode recommandée

1. Installer Node.js 22 ou plus récent.
2. Ouvrir un terminal dans le dossier du jeu.
3. Exécuter :

```bash
npm start
```

4. Ouvrir `http://localhost:4173` dans le navigateur.

Sous Windows, `start.bat` fait la même chose. Sous macOS ou Linux, utilisez `./start.sh` après lui avoir donné les droits d’exécution si nécessaire.

### Tests automatiques

```bash
npm run qa
```

La validation contrôle la syntaxe, les règles de contenu, le serveur HTTP et 16 scénarios de simulation : sauvegardes corrompues, économie, voisinages, évolutions, expéditions, commerce, délais d’action, combats et restauration d’une partie.

## Boucle de jeu

1. **Construire** sur les terrains de la carapace.
2. **Produire** bois, pierre, vivres, essence, perles et mécanismes.
3. **Loger** la population et conserver assez d’ouvriers.
4. **Nourrir la tortue**, maintenir sa vitalité et son harmonie.
5. **Accumuler prospérité et croissance** pour atteindre l’âge suivant.
6. **Explorer l’archipel** des créatures-mondes.
7. **Commercer, rallier ou combattre** les autres civilisations.
8. **Repousser les raids** maritimes et aériens qui frappent directement la carapace.

## Contenu jouable

- Cinq âges : Tortillon, Tortue nomade, Tortue-citadelle, Tortue ancienne et Tortue-monde elder.
- Carapace évolutive de 7×7 à 21×21 cases.
- Plus de vingt bâtiments avec coûts, production, main-d’œuvre, défense et bonus de voisinage.
- Terrains spécialisés : prairie, sol fertile, forêt, roche, source sacrée et crête.
- Population, logement, ouvriers, harmonie, vitalité, satiété, prospérité et croissance.
- Cycle jour/nuit et météo influençant la production.
- Expéditions maritimes, aériennes et mixtes avec durée, danger et récompenses variables.
- Autres tortues-mondes, baleines-mondes, crabes-forteresses, raies célestes, léviathans et ruines.
- Relations diplomatiques persistantes, commerce, exploration et assauts.
- Combats automatiques visibles avec projectiles, portée, dégâts, abordages et destruction de bâtiments.
- 15 quêtes de campagne, 8 expéditions, 10 événements à choix et un journal de partie.
- Conclusion de campagne au dernier âge et huit objectifs d’héritage pour prolonger le mode libre.
- Trois difficultés.
- Sauvegarde automatique, sauvegarde manuelle, export et import JSON.
- Interface responsive pour ordinateur, tablette et téléphone.
- Son procédural et ambiance générée par Web Audio.
- Installation PWA et fonctionnement hors ligne après la première ouverture servie par HTTP.

## Commandes

| Commande | Action |
|---|---|
| Clic | Sélectionner une case, un monde ou poser un bâtiment |
| Molette | Zoomer ou dézoomer la carapace |
| Double-clic | Recentrer la caméra |
| Flèches | Parcourir les cases de la carapace |
| Entrée | Inspecter une case ou construire sur la case sélectionnée |
| Échap | Annuler la construction et fermer les panneaux mobiles |
| Espace | Mettre en pause ou reprendre |
| 1 / 2 / 3 | Vitesse ×1 / ×2 / ×4 |
| B | Ouvrir le panneau de construction |
| M | Basculer entre la carapace et l’archipel |

## Structure du projet

```text
terra-testudo/
├── index.html                 Interface principale
├── styles.css                 Direction artistique et responsive
├── server.mjs                 Petit serveur HTTP sans dépendance
├── sw.js                      Cache hors ligne
├── manifest.webmanifest       Installation PWA
├── src/
│   ├── data.js                Âges, bâtiments, quêtes, ennemis et mondes
│   ├── state.js               Simulation, économie, progression et sauvegarde
│   ├── render.js              Rendu Canvas 2D procédural
│   ├── audio.js               Sons et ambiance Web Audio
│   └── main.js                Interface, contrôles et boucle principale
├── assets/                    Illustration de titre et icône PWA
├── scripts/qa.mjs             Validation de release sans dépendance
├── tests/state.test.mjs       Tests de simulation
├── tests/data.test.mjs        Contrats de contenu et de progression
├── GAME_DESIGN.md             Document de conception complet
├── CODEX_GUIDE.md             Consignes pour poursuivre avec Codex
├── QA_REPORT.md               Résultats des vérifications techniques
├── docs/screenshots/          Captures bureau et mobile validées
└── CHANGELOG.md               Historique des versions
```

## Sauvegarde

La sauvegarde principale et l’autosauvegarde utilisent `localStorage`. L’export JSON permet de conserver une copie indépendante ou de transférer une partie vers un autre appareil. Les événements ouverts ne sont pas sauvegardés afin d’éviter une partie bloquée au chargement.

## Technologie

- HTML5 et CSS natifs.
- JavaScript ES Modules.
- Canvas 2D pour le monde, les créatures et les combats.
- Web Audio pour les sons.
- Service Worker pour le cache hors ligne.
- Aucun framework et aucune dépendance de production.

## Licence

Code original distribué sous licence MIT. Le concept, les noms et les éléments graphiques procéduraux de ce projet sont originaux et s’inspirent du motif folklorique général de la tortue-monde.
