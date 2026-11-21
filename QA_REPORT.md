# Rapport de validation — Terra Testudo 1.1.0

Date de validation : 2 août 2026.

## Vérifications automatisées

Commande exécutée :

```bash
npm run qa
```

Résultat : **17 tests de simulation réussis**, contrat de contenu valide avec **15 quêtes, 8 expéditions et 10 événements**, syntaxe valide pour 11 fichiers JavaScript, préache hors ligne complet et smoke test HTTP réussi.

Scénarios couverts :

- création d’une nouvelle partie et génération de la carapace ;
- construction, paiement des coûts et recalcul économique ;
- passage à un âge supérieur et agrandissement de la grille ;
- lancement et résolution d’une expédition ;
- transaction commerciale avec une créature-monde ;
- victoire lors d’un raid et attribution des récompenses ;
- délais de commerce, exploration et attaque ;
- première découverte et revisite d’un monde ;
- suppression des contributions après démolition ou destruction ;
- choix de la sauvegarde valide la plus récente et repli après corruption ;
- assainissement d’une sauvegarde importée hostile ou incohérente ;
- persistance des réglages d’accessibilité et réparation de valeurs hors bornes.

## Vérifications de syntaxe et de serveur

Tous les modules JavaScript, le serveur, le service worker et les tests passent `node --check`.

Le préache du service worker est contrôlé : chaque fichier déclaré existe et chaque module importé par le jeu y figure, si bien que le jeu redémarre hors ligne avec ses pictogrammes.

## Contrôle de lisibilité des pictogrammes

Le même contrôle vérifie qu’un futur redessin ne peut pas réintroduire les défauts corrigés :

- les **288 tracés et 30 formes** restent sur la grille 24 (débordement toléré 0,6 px), arcs échantillonnés compris ;
- les **15 tailles d’icône par contexte** déclarées dans `styles.css` respectent leur plancher et restent carrées, et les **6 largeurs de trait** par contexte ne descendent pas sous 1,3 ;
- les **6 paires de contraste codées en dur** restent conformes : trait d’ennemi sur pastille maritime 5,24:1 et aérienne 6,42:1, texte principal 15,39:1, texte discret 4,85:1, texte doré 12,03:1 et segment actif 13,05:1 (seuil 4,5:1 partout).

Le palier 1 de lisibilité s’appuie sur ce contrôle : raie céleste, défenses, ennemis et récifs basaltiques redessinés sur la grille 24, symboles de carte portés de 19 à 23 px avec un trait de 1,8, et trait d’ennemi du canvas éclairci de `#2b2524` à `#100e0e` sur une pastille `#9b8163`. Les cartes verrouillées gardent leur pictogramme à pleine opacité et seule leur prose s’efface. Les badges d’ennemis sont bornés au cadre du canvas pour qu’un raid ne spawn jamais à moitié hors champ.

Le serveur local répond correctement sur :

- `/` avec l’interface HTML ;
- `/src/main.js` avec le type MIME JavaScript attendu ;
- les ressources PWA et les fichiers statiques du projet.

## Parcours navigateur vérifié

Validation effectuée dans Chromium en mode bureau et mobile :

- affichage du menu principal ;
- création d’une partie ;
- progression dans les trois scènes du guide avec simulation suspendue ;
- navigation sur la grille et construction d’une Terrasse nourricière entièrement au clavier ;
- validation de la première quête et affichage de l’objectif suivant ;
- affichage des huit héritages dans la Chronique ;
- résolution d’un événement narratif ;
- sauvegarde locale et reprise de la même partie ;
- restauration du focus après fermeture de l’aide ;
- contrôle du jeu et de l’accueil en format téléphone sans débordement du document.

Résolutions contrôlées :

- bureau : 1280×800 ;
- téléphone : 390×844.

## Captures de référence

Les captures validées sont disponibles dans `docs/screenshots/` :

- `menu-final.png` ;
- `gameplay-final.png` ;
- `mobile-menu-final.png` ;
- `mobile-gameplay-final.png`.

## Limites volontaires de cette version

Cette version 1.1.0 est un jeu complet et autonome en solo local. Le multijoueur réseau, les serveurs persistants et le partage communautaire des tortues ne sont pas simulés artificiellement : ils sont réservés à une future architecture en ligne décrite dans `CODEX_GUIDE.md`.
