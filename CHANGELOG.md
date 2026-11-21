# Historique des versions

## 1.1.0 — L’Héritage des carapaces

### Campagne et longévité

- Extension à 15 quêtes, 8 expéditions et 10 événements narratifs originaux.
- Ajout d’une conclusion de campagne au dernier âge et de huit héritages de mode libre.
- Première exploration pleinement récompensée, revisites réduites et délais cohérents pour le commerce, l’exploration et les assauts.
- Contribution des constructions recalculée après réparation, démolition ou destruction pour supprimer les gains permanents indus.
- Sauvegarde restaurée depuis la copie valide la plus récente, avec assainissement des données importées ou anciennes.
- Premier événement et premier raid retardés afin de laisser le temps d’installer la cité et ses défenses.

### Expérience

- Nouvelle illustration de titre originale produite pour Terra Testudo.
- Remplacement du texte d’ouverture par un prologue progressif en trois scènes qui suspend la simulation.
- Ajout de la navigation complète au clavier sur la grille, d’annonces accessibles et d’indicateurs de progression explicites.
- Amélioration du focus, de la fermeture à Échap et de la stabilité des modales lors des rafraîchissements de simulation.
- Aide conservée dans la barre mobile et confirmation avant d’écraser une sauvegarde existante.
- Remplacement des glyphes typographiques par des pictogrammes gravés, dessinés et redessinés pour rester lisibles aux tailles réelles de l’interface : bâtiments, expéditions, créatures-mondes, quêtes, événements, terrain et contrôles.
- Pictogrammes d’ennemis tracés sur le canvas avec `Path2D`, sur la même grille et le même trait que les icônes de l’interface.
- Réglages d’accessibilité enregistrés avec la partie : réduction des animations (interface et carapace), trois tailles de texte, contraste élevé et volumes séparés pour les effets sonores et l’ambiance marine.

### Release

- Passage du cache hors ligne en stratégie réseau prioritaire pour servir immédiatement les nouvelles versions.
- Durcissement du serveur statique et ajout des contrôles GET/HEAD, MIME, traversée de chemins et fichiers privés.
- Passage à 17 tests de simulation, ajout des contrats de contenu et d’un contrôle de release unique avec `npm run qa`.
- Préache hors ligne complété avec le module de pictogrammes et nouveau contrôle de `npm run qa` vérifiant que chaque fichier déclaré existe et que tout module importé par le jeu figure dans le préache.
- Nouveau contrôle de lisibilité dans `npm run qa` : grille 24 des tracés, tailles minimales par contexte et largeur de trait, contraste des paires de couleurs codées en dur.
- Lisibilité des pictogrammes, palier 1 : raie céleste, défenses, ennemis et récifs basaltiques redessinés, symboles de carte portés à 23 px avec un trait plus franc, trait des ennemis du canvas éclairci, cartes verrouillées lisibles et badges d’ennemis bornés au cadre du canvas.
- Prise en charge de la préférence système `prefers-reduced-motion` fusionnée avec le réglage du joueur.
- Suppression des champs `icon` Unicode devenus inutiles dans les données (bâtiments, ennemis, créatures-mondes, expéditions, ressources) et des replis typographiques correspondants dans le rendu.

## 1.0.0 — Fondation des Mondes-Dos

### Jeu

- Ajout de la boucle complète de construction, production, population et évolution.
- Ajout des cinq âges de tortue et de l’agrandissement réel de la carapace.
- Ajout de plus de vingt bâtiments répartis entre habitat, production, soutien, commerce, défense, industrie, savoir, spiritualité et monuments.
- Ajout des terrains spécialisés et des bonus de voisinage.
- Ajout de la satiété, de l’harmonie, de la vitalité, de la croissance et de la prospérité.
- Ajout du cycle jour/nuit et des météos productives.
- Ajout des expéditions avec durée, danger, infrastructures requises et récompenses variables.
- Ajout de l’archipel procédural de créatures-mondes.
- Ajout du commerce, de l’exploration, des relations et des attaques maritimes ou aériennes.
- Ajout des raids visibles, des projectiles, des portées, des dégâts de bâtiments, des brèches et des récompenses selon les éliminations réelles.
- Ajout des événements à choix, des quêtes et du journal.
- Ajout des trois difficultés et des vitesses de simulation.

### Interface

- Ajout d’une direction artistique originale océanique et mythologique.
- Ajout du rendu Canvas procédural de la tortue, de la ville, du monde et des combats.
- Ajout d’une interface responsive pour ordinateur et mobile.
- Ajout des panneaux Construction, Expéditions, Évolution, Archipel et Chronique.
- Ajout de l’observatoire de la cité, des cases et des mondes.
- Ajout des sons procéduraux, des notifications et des modales de résultat.

### Technique

- Ajout du serveur Node sans dépendance.
- Ajout de la sauvegarde automatique et manuelle.
- Ajout de l’import/export JSON.
- Ajout du manifeste PWA et du Service Worker hors ligne.
- Ajout de sept tests automatisés de logique.
- Vérification navigateur sans erreur console en 1440×900 et 390×844.
