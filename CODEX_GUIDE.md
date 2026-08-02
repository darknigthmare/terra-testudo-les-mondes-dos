# Guide de continuation avec Codex

## Objectif

Ce dépôt est volontairement sans framework ni dépendance afin que Codex puisse modifier rapidement le jeu et vérifier chaque système. Toute nouvelle fonction doit être réellement jouable, sauvegardée lorsque nécessaire et reliée à l’interface.

## Prompt principal à donner à Codex

```text
Travaille dans le projet Terra Testudo — Les Mondes-Dos.

Avant toute modification :
1. lis README.md, GAME_DESIGN.md, CHANGELOG.md et les fichiers de src/ ;
2. lance npm test ;
3. démarre le jeu avec npm start et vérifie l’interface dans un navigateur desktop et mobile ;
4. ne remplace pas les systèmes existants par des écrans factices ou des boutons sans logique ;
5. conserve le fonctionnement sans dépendance externe, sauf validation explicite ;
6. toute nouvelle donnée persistante doit être compatible avec hydrateGame() ;
7. ajoute ou adapte les tests ;
8. mets à jour CHANGELOG.md et la documentation concernée ;
9. termine en relançant npm test et en vérifiant qu’aucune erreur console n’apparaît.

Architecture :
- src/data.js : contenu statique et équilibrage ;
- src/state.js : simulation et règles ;
- src/render.js : rendu Canvas ;
- src/audio.js : sons ;
- src/main.js : interface et interactions ;
- styles.css : responsive et direction artistique.

Tâche à réaliser : [DÉCRIRE ICI LA MISE À JOUR].
```

## Règles d’implémentation

### Pas de fonctionnalité décorative

Un bouton d’expédition doit consommer des ressources, créer une mission persistante, avancer avec le temps et fournir un résultat. Une nouvelle défense doit tirer dans `simulateCombat`. Un nouveau besoin de la tortue doit modifier la simulation.

### Données séparées de la logique

Ajouter en priorité les définitions dans `data.js`, puis leur comportement dans `state.js`. Le rendu ne doit pas contenir les règles économiques.

### Sauvegarde compatible

Les nouveaux champs doivent avoir une valeur par défaut dans `createGame`. `hydrateGame` doit accepter une sauvegarde qui ne possède pas encore ces champs.

### Tests minimums

Pour chaque système de logique, ajouter un test déterministe dans `tests/state.test.mjs`. Utiliser une graine fixe et neutraliser les événements aléatoires lorsque le test fait avancer le temps.

### Vérification visuelle

Tester au minimum :

- 1440×900 ;
- 390×844 ;
- nouvelle partie ;
- chargement d’une sauvegarde ;
- changement de vue ;
- ouverture des deux panneaux mobiles ;
- absence d’erreur JavaScript dans la console.

## Exemples de mises à jour propres

### Ajouter une nouvelle créature-monde

1. Ajouter son archétype dans `WORLD_NODE_ARCHETYPES`.
2. Ajouter sa silhouette dans `drawWorldCreature`.
3. Définir ses récompenses et préférences dans les actions diplomatiques.
4. Ajouter au moins un test de génération ou d’interaction.
5. Documenter la créature dans `GAME_DESIGN.md`.

### Ajouter une défense

1. Définir coût, âge, cibles, portée, cadence et dégâts dans `BUILDINGS`.
2. Ajouter l’identifiant dans les déblocages d’un âge.
3. Dessiner le bâtiment dans `render.js`.
4. Vérifier son action dans `simulateCombat`.
5. Tester qu’une vague appropriée peut être vaincue.

### Ajouter un nouvel âge

1. Étendre `TIERS` et `MAX_GRID` si nécessaire.
2. Ajouter les bâtiments et prérequis.
3. Vérifier le calcul des limites actives.
4. Adapter la caméra pour la nouvelle taille.
5. Tester l’évolution et la sauvegarde.

## Critères d’acceptation d’une mise à jour

- Le système est accessible par l’interface.
- Il produit un effet observable dans la partie.
- Il respecte les deux voies mer/ciel lorsqu’elles sont concernées.
- Il fonctionne en pause, aux vitesses ×1, ×2 et ×4.
- Il ne casse pas le responsive.
- Il est sauvegardé et rechargé correctement.
- Les tests passent.
- Le changelog explique les fichiers et comportements modifiés.
