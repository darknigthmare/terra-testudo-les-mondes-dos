# Document de conception — Terra Testudo : Les Mondes-Dos

> **Bible du jeu — version 1.1.0.** Ce document est la source de vérité narrative, mécanique et
> artistique du projet. Toute donnée de `src/data.js` doit pouvoir être justifiée ici, et tout
> élément écrit ici doit pouvoir être retrouvé dans le jeu ou planifié dans la dernière partie.
> En cas de contradiction entre ce texte et le code, **le code fait foi pour les nombres**, ce
> document fait foi pour le sens.

## Sommaire

1. Vision et promesse
2. Piliers
3. Boucle de jeu et rythme d'une partie
4. Le canon du monde
5. Les peuples de l'archipel
6. La cité et son économie
7. La guerre des deux voies
8. La diplomatie
9. La campagne en cinq actes
10. Les dix événements du voyage
11. Les huit expéditions
12. Personnages
13. Ton, écriture et nomenclature
14. Direction artistique
15. Son et musique
16. Accessibilité et confort
17. Ce qu'il faut pour un jeu complet
18. Annexes (lexique, chronologie, table canon ↔ code, banque de noms)

---

## 1. Vision et promesse

**Terra Testudo** fusionne trois genres :

- un city-builder sur une surface limitée mais évolutive ;
- un jeu de voyage et de diplomatie entre créatures-mondes ;
- une défense de cité contre des attaques maritimes et aériennes visibles.

La ville n'est jamais séparée de la créature qui la porte. Sa croissance dépend autant de
l'urbanisme que de la santé, de la satiété et de l'harmonie de la tortue.

**Promesse au joueur** : « Tu ne bâtis pas une ville posée sur un monstre. Tu soignes un être
vivant assez vaste pour porter une civilisation, et tu décides ce que cette civilisation devient
pour l'archipel. »

**Fantaisie du joueur** : commencer avec une maison sur une carapace de sept cases et finir à la
tête d'une région de vingt-et-une cases, capable de fédérer ou de briser les autres mondes-dos.
Le joueur doit ressentir qu'il ne construit pas seulement une ville, mais **un monde vivant qui
marche, nage, rêve et vieillit**.

**Contrat de ton** : mythique et maritime, jamais grandiloquent. On parle de marées, d'écailles,
de courants, de sel et de mémoire. Aucun vocabulaire moderne (pas de « technologie », pas de
« ressources financières », pas de « niveau de bonheur » affiché : on dit harmonie, satiété,
prospérité).

---

## 2. Piliers

### 2.1 Un territoire vivant

La grille grandit réellement à chaque évolution : 7×7, 11×11, 15×15, 19×19, 21×21. Ce n'est pas
une abstraction : les **plaques de la carapace s'éveillent**. Une écaille endormie est grise et
stérile ; une écaille éveillée porte un terrain (prairie, terreau, bosquet, roche, source, crête).
Chaque âge est donc une **promesse géographique** : « ce que tu vois au loin deviendra constructible ».

### 2.2 Une croissance méritée

L'évolution exige simultanément prospérité urbaine, essence spirituelle, croissance de la
créature, harmonie et satiété suffisantes. Le joueur ne peut pas acheter un âge : il doit rendre
la cité désirable **et** la tortue vivante. Les cinq seuils sont visibles dans le panneau
Évolution, avec leur état accompli/manquant.

### 2.3 Un archipel de géants

Les autres civilisations vivent sur des tortues, des baleines, des crabes, des raies volantes, des
léviathans ou des ruines. Chacune a une puissance, une relation persistante, une préférence
(commerce, esprit, guerre, air, raid, exploration) et un milieu d'accès (mer ou ciel).

### 2.4 Deux axes militaires

La mer et le ciel sont deux voies distinctes. Un port ne remplace pas un aérodrome ; une tour de
vigie voit les deux, une baliste aussi, mais un port ne tire que sur la mer et un nid de planeurs
que sur le ciel. Le joueur doit **choisir une doctrine**, pas empiler des défenses.

### 2.5 Une mémoire qui reste

Le journal, les relations, les héritages et la chronique de fin de campagne doivent donner au
joueur le sentiment d'avoir écrit une histoire singulière, pas seulement rempli des jauges.

---

## 3. Boucle de jeu et rythme d'une partie

### 3.1 Boucle courte (30 secondes à 2 minutes)

Observer la carapace → lire les jauges (satiété, vitalité, harmonie) → poser ou réparer un
bâtiment → nourrir la tortue si nécessaire → vérifier les chantiers d'expédition → répondre à un
événement ou à une alerte de raid.

### 3.2 Boucle moyenne (10 à 20 minutes)

Atteindre un palier de prospérité → débloquer une infrastructure (port, aérodrome, atelier,
académie) → ouvrir une route vers un monde → obtenir une ressource rare (perles, mécanismes) →
préparer l'évolution suivante.

### 3.3 Boucle longue (une campagne, 4 à 8 heures selon la difficulté)

Cinq âges, quinze quêtes, dix événements, huit expéditions, neuf mondes visitables, des raids de
plus en plus lourds, puis la conclusion de campagne et le mode libre à huit héritages.

### 3.4 Rythme imposé par le code

- La simulation tourne en continu (×1, ×2, ×4), se met en pause pendant le prologue, les
  événements, les résultats de raid et la conclusion de campagne.
- L'autosauvegarde a lieu toutes les douze secondes et à la fermeture de l'onglet.
- Le premier événement et le premier raid sont retardés pour laisser installer la cité.
- Difficultés : **Conte** (production ×1,18, raids ×0,72), **Voyage** (référence),
  **Tempête** (production ×0,92, raids ×1,32).

### 3.5 Ce que le joueur ne fait jamais

Il ne perd jamais sa partie d'un coup : si la vitalité tombe à zéro, la tortue **plonge** et la
cité survit amputée. Il n'y a pas d'écran de game over, seulement des cicatrices.

---

## 4. Le canon du monde

### 4.1 Cosmogonie — la Mer sans Fond et le Rêve

Avant les mondes, il n'y avait que la **Mer sans Fond**, une eau sans surface ni rivage, qui
rêvait. Chaque rêve assez vaste pour durer se condensait en **écaille** : une plaque de matière
rêvée, dure comme la pierre, tiède comme un dos. La première de ces écailles s'appelle **la
Première Carapace** ; elle n'a jamais été vue entière, seulement par fragments, et son sanctuaire
est le plus haut bâtiment spirituel du jeu.

Les créatures n'ont pas été créées : elles se sont **souvenues**. Une tortue est un rêve de la
Mer qui a pris la forme d'un dos pour ne pas se disperser. C'est pourquoi une tortue-monde
**grandit quand on l'aime** : la mémoire d'un rêve s'épaissit à mesure qu'on y vit.

**Règle de canon** : personne, dans le jeu, ne dit « dieu » ni « magie ». On dit *la Mer*, *le
Rêve*, *l'Essence*, *les courants*.

### 4.2 Les Mondes-Dos et le Grand Tour

Une créature assez vieille porte des villages, puis des villes : elle devient un **monde-dos**.
Toutes suivent un circuit lent appelé **le Grand Tour**, un courant circulaire qui relie les
fosses abyssales, les hauts-courants célestes et les jardins de varech. Deux mondes-dos ne se
croisent jamais deux fois au même endroit : c'est l'explication diégétique de l'**archipel
procédural** (neuf points d'intérêt par partie, révélés par l'âge et l'exploration, avec des
noms et des factions tirés au sort).

Le joueur incarne une **Maison** (la « cité ») fondée sur un tortillon. Il choisit son nom et
celui de la tortue : ce sont les deux seuls mots que le jeu lui demande d'écrire.

### 4.3 L'Essence — la mémoire qui se récolte

L'**Essence** est la mémoire condensée d'un rêve. Elle affleure aux **sources sacrées**, se
capte dans les nuages hauts et se boit dans les temples. Elle sert à trois choses :

- **éveiller** une carapace (rituel d'évolution, environ 45 % de l'essence requise) ;
- **construire** ce qui touche au spirituel (temple, sanctuaire, racine du monde) ;
- **soigner** ce qui est blessé (les soigneurs en produisent lentement).

L'Essence n'est jamais une monnaie : on ne l'échange pas avec les marchands, on l'**offre** aux
mondes qui la préfèrent (baleines, ruines).

### 4.4 Les cinq âges — l'Éveil des plaques

| Âge | Grille | Population max. | Ce que raconte l'âge |
|---|---:|---:|---|
| **Tortillon** | 7×7 | 12 | Une maison, une culture, un puits. La carapace est encore molle et l'horizon, vide. |
| **Tortue nomade** | 11×11 | 35 | Le hameau apprend à commercer, à tailler la pierre et à prendre la mer. |
| **Tortue-citadelle** | 15×15 | 80 | La ville se fortifie, invente l'atelier, ouvre le ciel avec l'aérodrome. |
| **Tortue ancienne** | 19×19 | 170 | Une région : temples, murailles, grand marché, racine du monde. |
| **Tortue-monde elder** | 21×21 | 320 | Un royaume vivant ; la citadelle, le canon de tempête, le sanctuaire et la porte des courants. |

Chaque évolution **soigne la tortue** (la croissance est physique), **réveille des plaques**
(la grille s'étend) et **révèle des mondes** supplémentaires dans l'archipel.

### 4.5 Géographie

- **La Mer d'Écume** : les eaux de la première maison, calmes, riches en récifs dérivants.
- **Les Hauts-Courants** : le ciel navigable, traversé par les raies célestes, où flottent les
  aérodromes et les nids de planeurs.
- **Les Fosses** : la mer profonde, sans lumière, d'où montent les rejetons abyssaux et le
  Long Silence.
- **Les Jardins de varech** : forêts flottantes, nourricières et sacrées, visitées par les
  pèlerins.
- **La Chaîne basaltique** : récifs noirs portant les traces des migrations anciennes.
- **Les Atolls et ruines** : sites fixes, neutres, riches en mémoire et en dangers.

### 4.6 Histoire — six ères

1. **Le Rêve** — rien que la Mer et ses écailles.
2. **L'Écaille Première** — la première carapace se souvient d'elle-même ; les mondes-dos apprennent à porter.
3. **L'Âge des Convois** — les perles deviennent monnaie d'échange, les routes du Grand Tour se cartographient.
4. **La Grande Fêlure** — une plaque se brise ; quelque chose s'éveille dans les Fosses. Les ruines datent de là.
5. **Les Siècles de Sel** — les crabes-forteresses prospèrent sur la guerre, le sel et les chantiers navals.
6. **L'Ère des Voiles Hautes** — les raies et les planeurs ouvrent le ciel ; la Cour du Vent Blanc codifie l'air. **C'est ici que le joueur fonde son tortillon.**

### 4.7 Écologie et météores

Chaque météo a une cause et un effet lisible :

- **Pluie nourricière** (la Mer respire) : vivres en hausse.
- **Brume nacrée** (les coquillages rêvent) : perles en hausse.
- **Vents hauts** (le ciel se vide) : essence en hausse, cultures fragilisées.
- **Mer d'huile** (le Grand Tour ralentit) : léger bonus vivres et commerce.
- **Orage lointain** (une raie-tempête passe) : mécanismes et essence en hausse.

La faune nommée dans le jeu : **méduses-lanternes** (migration lumineuse), **planeurs**,
**varech**, **mousse irisée**, **raies célestes**, **rejetons abyssaux**. Aucune créature
n'existe hors de cette liste sans entrée dans le codex.

### 4.8 Société, droit et calendrier

- **Calendrier** : les jours s'affichent en « Jour N » ; la journée a une phase (aube, jour,
  crépuscule, nuit). La météo change à l'aube.
- **Monnaie** : la **perle** est l'unité d'échange entre mondes ; le **mécanisme** est l'unité
  industrielle ; le **bois**, la **pierre**, les **vivres** et l'**essence** ne sont pas monnayés.
- **Droit des carapaces** : un monde-dos est inviolable tant qu'il n'a pas été approché. Une
  première approche est un **rite**, pas une attaque. Un assaut non provoqué abaisse la relation
  de façon durable et déclenche une contre-attaque.
- **Hospitalité** : refuser l'eau à un équipage en détresse est mal vu (cf. événement « Planeur à la dérive »).

---

## 5. Les peuples de l'archipel

Six archétypes, douze factions nommées, une préférence et un milieu d'accès. Les noms et factions
sont ceux du code ; le reste est canon narratif.

### 5.1 Tortues-mondes

**Noms** : Ammara, Khelon, Orméane, Talassar, Virdos.
**Factions** : Pèlerins de Jade, Ligue des Carapaces, Veilleurs des Courants.
**Doctrine** : la carapace est un bien commun ; on prête ses jardins, on ne les vend pas.
**Préférence** : commerce. **Relation initiale** : +18.

- *Pèlerins de Jade* : voyagent de source en source, échangent des vivres contre des récits.
  Ils jugent le joueur sur son harmonie, pas sur sa puissance.
- *Ligue des Carapaces* : assureurs et négociants ; ils aiment les ports et les marchés, méprisent
  les dettes de vivres.
- *Veilleurs des Courants* : gardiens de phares, cartographes ; ils vendent des routes et
  n'attaquent jamais les premiers.

**Lecture de jeu** : l'autre tortue est le miroir du joueur. Rallier une tortue, c'est se
reconnaître dans un voisin.

### 5.2 Baleines-mondes

**Noms** : Mhor-Gale, Abyssa, Uulmar.
**Factions** : Cités du Grand Souffle, Chorale des Profondeurs.
**Doctrine** : la mémoire se chante ; une cité qui oublie meurt avant sa carapace.
**Préférence** : esprit. **Relation initiale** : +4.

Les baleines portent des temples sonores dans leurs évents. Leur commerce est un échange
d'essence contre des chants : elles donnent peu de matière, beaucoup de croissance.

### 5.3 Crabes-forteresses

**Noms** : Bastion-Krabe, Rouge-Marche, Karsk.
**Factions** : Clans de la Pince, Forgeurs de Sel.
**Doctrine** : la mer appartient à qui la tient ; le sel est une arme.
**Préférence** : guerre. **Relation initiale** : −12.

Les clans vivent de duels et de razzias ; les Forgeurs vendent des mécanismes à tous, y compris
aux ennemis du joueur. Un crabe vaincu ne disparaît pas : il devient un client méfiant.

### 5.4 Raies célestes

**Noms** : Célestine, Manta-Lune, Aër-Nava.
**Factions** : Nomades du Zénith, Cour du Vent Blanc.
**Doctrine** : l'air n'a pas de propriétaire, mais il a des règles.
**Préférence** : air. **Relation initiale** : +12.

Les Nomades transportent des caravanes de toile ; la Cour codifie les routes hautes et punit les
pirates du ciel. Sans aérodrome, on ne les approche pas.

### 5.5 Léviathans

**Noms** : Voremar, Nhal-Abysse, Le Long Silence.
**Factions** : Essaim des Fosses, Sans-Port.
**Doctrine** : ce qui flotte est une proie qui s'ignore.
**Préférence** : raid. **Relation initiale** : −42.

Les Fosses produisent les rejetons abyssaux ; les Sans-Port fournissent les skiffs et les
planeurs pirates. Ce sont les antagonistes naturels de la campagne.

### 5.6 Sites

**Noms** : Atoll des Ancêtres, Éclat de Nacre, Ruines de l’Aube.
**Faction** : Site neutre. **Préférence** : exploration. **Relation initiale** : 0.

Aucun peuple : de la mémoire, des ressources et des dangers. Les ruines sont les meilleurs
endroits pour trouver de l'essence et des fragments de la Grande Fêlure.

---

## 6. La cité et son économie

### 6.1 Terrains

| Terrain | Récit | Affinité |
|---|---|---|
| Prairie de carapace | La plaque la plus commune, tiède et stable. | Polyvalent |
| Terreau fertile | Poussière d'écaille et pluie ancienne. | Vivres |
| Bosquet dorsal | Arbres courts nourris par la sève de la tortue. | Bois |
| Écaille rocheuse | Plaque minéralisée, dure à percer. | Pierre |
| Source sacrée | Une fissure où affleure le Rêve. | Essence |
| Crête ancienne | Bourrelet de la Grande Fêlure, instable. | Défenses lourdes |

### 6.2 Ressources

- **Bois** : habitat, quais, ateliers, structures légères.
- **Pierre** : bâtiments lourds, remparts, monuments.
- **Vivres** : population, entretien, expéditions, nourriture de la tortue.
- **Essence** : rituels d'évolution, bâtiments spirituels.
- **Perles** : commerce, savoir, forces avancées.
- **Mécanismes** : défenses lourdes, aérodromes, monuments elder.

**Prospérité** et **croissance** ne se dépensent pas : ce sont des mesures d'accomplissement.
**Harmonie**, **vitalité**, **satiété** sont des jauges vivantes. **Défense temporaire** est un
bouclier d'événement, jamais permanent.

### 6.3 Bâtiments et leur histoire

| Catégorie | Bâtiment | Récit |
|---|---|---|
| Habitat | **Maison-coquille** | Murs de bois sur fondation d’écaille, toit bombé ; quatre habitants, la cité s’installe. |
| Production | **Terrasse nourricière** | Cultures en gradins sur la pente du dos. |
| Production | **Bosquet cultivé** | Taillis entretenu, jamais abattu à blanc. |
| Production | **Carrière d’écaille** | On prélève la pierre que la tortue perd naturellement. |
| Soutien | **Puits de rosée** | Condense la brume en eau potable. |
| Soutien | **Réservoir nuageux** | Outre de toile et de verre, réserve pour les sécheresses. |
| Soutien | **Maison des soigneurs** | Onguents d’essence, pansements de varech. |
| Commerce | **Marché des marées** | Tréteaux montés à marée basse, perles contre vivres. |
| Commerce | **Grand bazar intermonde** | Un lieu où les dialectes se mélangent. |
| Défense | **Tour de vigie** | Guet de mer et de ciel, la première à voir les voiles. |
| Défense | **Palissade vivante** | Épines de bois repiquées dans l’écaille. |
| Défense | **Baliste des horizons** | Arme polyvalente, mer et ciel. |
| Défense | **Muraille de basalte** | Renforce la vitalité maximale de la tortue. |
| Défense | **Canon de tempête** | Capture l’orage, frappe les deux voies. |
| Forces | **Port d’écaille** | Ouvre la mer, les navires et les expéditions maritimes. |
| Forces | **Aérodrome suspendu** | Ouvre le ciel, les planeurs et la guerre aérienne. |
| Forces | **Nid des grands planeurs** | Escadre d’interception d’élite. |
| Industrie | **Atelier dorsal** | Le seul bâtiment qui produit des mécanismes. |
| Savoir | **Académie des navigateurs** | Cartes, courants, équipages supplémentaires. |
| Spirituel | **Temple des Quatre Piliers** | Les quatre vents et les quatre marées. |
| Spirituel | **Racine du monde** | Lien direct au rêve de la tortue, accélère sa croissance. |
| Spirituel | **Sanctuaire de la Première Carapace** | Mémoire originelle, unique. |
| Monument | **Citadelle des mondes-dos** | Cœur politique et militaire d’un royaume elder. |
| Monument | **Porte des grands courants** | Canalise les courants de l’archipel en un flux de perles. |

**Règle de canon** : un bâtiment est un **geste**, pas un objet. Sa description dit toujours ce
qu'il fait à la tortue ou à ses habitants.

### 6.4 Population et travail

Environ 72 % de la population travaille. Les maisons augmentent le logement dans la limite de
l'âge. Quand les ouvriers manquent, les bâtiments gardent un rendement minimal et perdent en
efficacité. La population croît si des logements sont libres, les vivres suffisants et
l'harmonie au-dessus du seuil de crise ; elle décroît lentement en famine.

### 6.5 Besoins de la tortue

- **Satiété** : baisse avec le temps et la taille ; nourrir consomme des vivres et rend de la croissance.
- **Vitalité** : santé générale ; les abordages la réduisent, les soigneurs la restaurent, les murs augmentent son maximum.
- **Harmonie** : confort, vivres, absence de surpopulation, lieux culturels. Une harmonie basse ralentit croissance et population.

---

## 7. La guerre des deux voies

### 7.1 Pourquoi on se bat

Les raids ne sont pas aléatoires : un monde hostile envoie ses pillards pour piller les vivres et
les perles d'une carapace riche. Plus la cité est prospère, plus la vague est lourde. Un assaut
du joueur, lui, blesse la relation et provoque une contre-attaque jouée comme un raid.

### 7.2 Les six assaillants

| Ennemi | Voie | Récit |
|---|---|---|
| **Skiff pillard** | mer | Barque rapide des Sans-Port, équipage de trois pilleurs. |
| **Bélier des récifs** | mer | Coque renforcée des Clans de la Pince, faite pour éventrer un flanc. |
| **Rejeton abyssal** | mer | Éclos dans les Fosses, lent, énorme, il monte vers la lumière. |
| **Planeur pirate** | ciel | Déserteur de la Cour du Vent Blanc, rapide et fragile. |
| **Bombardier des nuages** | ciel | Aérostat chargé de mécanismes, lâche ses charges sur les toits. |
| **Raie-tempête** | ciel | Raie portée par un orage ; elle ne vise pas, elle frappe. |

### 7.3 Déroulement

Les assaillants partent d'un anneau extérieur et progressent vers le bord de la carapace. Les
défenses tirent automatiquement selon leur portée, leurs cibles et leur cadence. Un ennemi détruit
donne sa récompense ; un ennemi qui atteint le dos inflige des dégâts, peut détruire un bâtiment,
compte comme brèche et non comme élimination.

### 7.4 Issues

- Vitalité à zéro : la tortue **plonge**, la cité survit amputée, la partie continue.
- Vague terminée : raid survécu ou repoussé, récompenses proportionnelles aux éliminations et aux brèches.
- Aucune défaite totale : le jeu n'a pas d'écran de game over.

---

## 8. La diplomatie

Relation persistante de −100 à +100, affichée par un mot et une couleur.

| Palier | Sens | Ce que cela ouvre |
|---|---|---|
| −100 à −45 | Hostile | Assauts fréquents, commerce fermé. |
| −44 à −1 | Méfiant | Commerce fermé sous −25. |
| 0 à 24 | Neutre | Commerce et exploration possibles. |
| 25 à 59 | Allié | Héritage « Fédération des géants », échanges plus généreux. |
| 60 à 100 | Fédéré | Le monde devient un partenaire stable. |

Actions : **explorer** (première approche, récompense unique puis revisite réduite), **commercer**
(délai de retour), **attaquer** (assaut, contre-attaque, chute brutale de relation). Toutes les
actions ont un délai réel et un coût en vivres ou en essence, ce qui empêche le clic frénétique.

---

## 9. La campagne en cinq actes

La campagne suit les cinq âges. Chaque acte a un **thème**, une **voix** (qui parle au joueur) et
un **objectif de sortie** matérialisé par une quête de type `tier`.

### Acte I — L'Éveil (Tortillon)

- **Thème** : la survie douce. On apprend à nourrir, loger, veiller.
- **Voix** : Nerée de la Vigie, la première habitante à savoir lire l'horizon.
- **Quêtes** : 1 à 5 (`firstFarm`, `firstHomes`, `firstWell`, `firstWatchtower`, `population8`).
- **Sortie** : `firstEvolution` → Tortue nomade.
- **Texte d'ambiance** : « Une maison n'est pas une cité. Mais ce soir, la carapace a chaud. »

### Acte II — Les Voiles (Tortue nomade)

- **Thème** : sortir de soi. Le marché, le port, la première expédition.
- **Voix** : Sable, la quartier-maître du marché des marées.
- **Quêtes** : 6 à 9 (`firstMarket`, `firstHarbor`, `firstExpedition`, `firstVictory`).
- **Sortie** : `citadelAwakening`.
- **Texte d'ambiance** : « Le monde a cessé d'être un décor : il a des clients, des rivaux et des dettes. »

### Acte III — Les Routes (Tortue-citadelle)

- **Thème** : la cité devient un acteur ; l'académie cartographie, l'aérodrome ouvre le ciel.
- **Voix** : l'Archiviste Onze-Plumes.
- **Quêtes** : 10 à 12 (`firstAcademy`, `seasonedVoyagers`, `elder`).
- **Sortie** : `worldback`.
- **Texte d'ambiance** : « Onze-Plumes dit que les courants se souviennent. Il faudrait vérifier. »

### Acte IV — La Fêlure (Tortue ancienne)

- **Thème** : le prix de la grandeur. Les Fosses s'agitent ; les murailles et les temples pèsent.
- **Voix** : Mère Tilo, soigneuse, et la Chorale des Profondeurs.
- **Contenu** : raids lourds, événements de fissure, expéditions basaltiques.
- **Texte d'ambiance** : « La carapace craque là où elle a le plus grandi. »

### Acte V — Le Monde sur son dos (elder)

- **Thème** : choisir ce que l'on laisse. Fédérer ou dominer, sanctuariser ou commercer.
- **Voix** : la tortue elle-même, dans le rêve (événement `turtleDream` prolongé).
- **Fin** : conclusion de campagne, puis mode libre et huit héritages.
- **Texte final** : « Tu n'as pas bâti une ville sur un monstre. Tu as appris à un rêve à porter des gens. »

### 9.1 Les quinze quêtes, raccrochées au récit

| # | Quête | Acte | Ce qu'elle raconte |
|---:|---|---|---|
| 1 | Nourrir le dos vivant | I | La première terrasse : on demande à la tortue de nourrir ceux qu'elle porte. |
| 2 | Un véritable hameau | I | Trois maisons : le mot « village » devient vrai. |
| 3 | La rosée des hauteurs | I | Le puits apprend à boire le ciel. |
| 4 | Les yeux sur l’horizon | I | La vigie : regarder avant d’être regardé. |
| 5 | Les voix sur la carapace | I | Huit habitants : une rumeur de vie. |
| 6 | Le premier grand éveil | I | L'évolution : la carapace s'ouvre. |
| 7 | Le pacte des marées | II | Le marché : la première perle gagnée, pas volée. |
| 8 | Au-delà de la carapace | II | Le port : la mer devient une route. |
| 9 | Le monde est un archipel | II | La première expédition revient. |
| 10 | La carapace tient bon | II | Le premier raid repoussé. |
| 11 | La ville prend racine | III | La citadelle : la cité devient une puissance. |
| 12 | Lire les grands courants | III | L'académie : la mer devient une carte. |
| 13 | Des routes entre les mondes | III | Cinq expéditions : le réseau existe. |
| 14 | Une région vivante | IV | L'âge ancien : le dos porte une région. |
| 15 | Le monde sur son dos | V | La campagne s'accomplit. |

### 9.2 Les huit héritages (mode libre)

| Héritage | Récit |
|---|---|
| Porteuse d’un royaume | La tortue a atteint son dernier âge ; le titre reste. |
| Cent voix sur le dos | Une foule, pas une population. |
| Maître des courants | Huit expéditions : les routes sont à toi. |
| Carapace imprenable | Cinq raids gagnés : les Fosses renoncent. |
| Gardienne de l’archipel | Trente ennemis vaincus. |
| Tous les mondes connus | Neuf mondes visités : l'archipel est cartographié. |
| Fédération des géants | Trois mondes alliés. |
| Trois merveilles elder | Citadelle, sanctuaire et porte des courants debout ensemble. |

---

## 10. Les dix événements du voyage

Chaque événement est une **scène**, pas un bonus. Il doit pouvoir être raconté en une phrase.

1. **Pluie tiède** — la Mer respire. *Ouvrir les citernes* : on accepte le don.
2. **Écailles fissurées** — une plaque se soulève sous un quartier. *Réparer* (pierre) ou *laisser guérir* (la tortue souffre, l'essence affleure).
3. **Marchands dérivants** — une flottille sans port. *Échanger* des vivres contre outils et perles, ou *décliner*.
4. **Le rêve de la tortue** — un chant nocturne. *Écouter* (essence, croissance) ou *faire la fête* (harmonie, prospérité).
5. **Ombre dans les nuages** — une formation inconnue. *Signaler* (relation) ou *armer* (défense temporaire).
6. **Migration des lanternes** — méduses lumineuses. *Partager* (harmonie, essence) ou *récolter* (perles, harmonie en baisse).
7. **Le courant profond** — la tortue infléchit sa route. *Renforcer les amarres* (défense, vitalité) ou *suivre l'instinct* (croissance, vitalité en baisse).
8. **Planeur à la dérive** — un équipage céleste perdu. *Offrir des mécanismes* (essence, perles) ou *récupérer l'épave* (mécanismes, bois).
9. **Jardin d’écaille** — une mousse irisée autour d’une source. *Laisser s'étendre* (essence, croissance) ou *dégager* (bois, prospérité).
10. **Fête du sel neuf** — la première récolte. *Grand repas* ou *veillée sobre* : deux manières d'être riche.

**Règle de canon** : aucun événement ne propose un choix « évidemment bon ». Chaque option coûte
quelque chose — vivres, vitalité, harmonie, relation.

---

## 11. Les huit expéditions

| Expédition | Voie | Prérequis | Récit |
|---|---|---|---|
| **Récifs dérivants** | mer | — | Bois flotté, pierre ponce, vivres ; l'école du voyage. |
| **Épave sous la pluie** | mer | port | Une coque ancienne pleine de mécanismes. |
| **Moisson des nuages** | air | aérodrome | Les planeurs captent essence et spores. |
| **Route de la Première Écaille** | mixte | académie | Une carte mythique vers l'origine des mondes-dos. |
| **Jardins de varech** | mer | port | Longer les forêts flottantes, nourrir et soigner. |
| **Veille de l’orage** | air | aérodrome + atelier | Observer le front, récupérer les mécanismes perdus. |
| **Chemin des écailles noires** | mixte | port + académie | Cartographier les récifs basaltiques de la Fêlure. |
| **Convoi des mondes-dos** | mixte | grand bazar + académie | Escorter un convoi entre plusieurs créatures-mondes. |

Chaque expédition a une durée, un coût en vivres, un danger et une table de récompenses. Un
accident réduit le butin : le danger n'est jamais une simple taxe, c'est une **histoire de
tempête**.

---

## 12. Personnages

Le jeu n'a aujourd'hui qu'un personnage nommé : **la tortue**. La version complète doit ajouter
une distribution stable, réutilisée par les quêtes, les événements et le codex.

### 12.1 La tortue (Oroméa par défaut)

- **Rôle** : le monde lui-même, mais aussi un personnage qui a des humeurs.
- **Voix** : jamais de dialogue direct, sauf dans le rêve. Elle « répond » par la météo, les
  fissures, les sources qui affleurent.
- **Arc** : tortillon craintif → nomade curieuse → citadelle assurée → ancienne fatiguée →
  elder sereine.
- **Détail** : son nom est choisi par le joueur ; le canon l'appelle toujours « la tortue » quand
  le nom n'est pas connu.

### 12.2 Nerée de la Vigie

- **Rôle** : capitaine de guet, première voix du tutoriel.
- **Voix** : sèche, précise, un peu maternelle. Elle compte tout.
- **Arc** : elle doute de la mer au début, puis devient la gardienne des routes.
- **Réplique** : « Une vigie ne voit pas loin. Elle voit tôt. »

### 12.3 Sable

- **Rôle** : quartier-maître du marché des marées.
- **Voix** : marchande, ironique, généreuse en perles et avare en vivres.
- **Arc** : de tréteaux de marée basse au grand bazar intermonde.
- **Réplique** : « Le sel ne ment jamais sur le prix. »

### 12.4 L'Archiviste Onze-Plumes

- **Rôle** : cartographe de l'académie, gardien du canon.
- **Voix** : phrases longues, précision maniaque, enthousiasme maladroit.
- **Arc** : il découvre que la Fêlure n'est pas un mythe.
- **Réplique** : « Les courants se souviennent. C'est très gênant pour les archives. »

### 12.5 Mère Tilo

- **Rôle** : soigneuse, conscience morale de la cité.
- **Voix** : douce, directe, refuse les décisions qui blessent la tortue.
- **Arc** : elle s'oppose aux monuments qui fatiguent la carapace, puis les accepte.
- **Réplique** : « On ne guérit pas un dos en le chargeant de pierres. »

### 12.6 Consul Vhar (crabe)

- **Rôle** : émissaire des Clans de la Pince, adversaire diplomatique récurrent.
- **Voix** : courtoise, procédurière, menaçante sans insulte.
- **Arc** : de rival à partenaire contraint si la relation dépasse +25.
- **Réplique** : « Je ne vous menace pas. Je vous informe de la marée. »

### 12.7 La Chorale (baleines)

- **Rôle** : alliée spirituelle, gardienne de la mémoire de la Fêlure.
- **Voix** : chant choral transcrit en didascalies.
- **Arc** : elle reconnaît dans la tortue du joueur une « mémoire qui marche ».

### 12.8 Le Long Silence (léviathan)

- **Rôle** : antagoniste de fond, jamais vu entièrement.
- **Voix** : aucune. Des messages, des traces, des rejetons.
- **Arc** : il ne cherche pas la guerre, il cherche à **finir un rêve**. Le joueur choisit s'il
  l'achève, l'endort ou le laisse partir.

---

## 13. Ton, écriture et nomenclature

### 13.1 Registre

- Phrases courtes dans l'interface, phrases longues dans le codex.
- Pas d'humour contemporain, pas de références techniques, pas d'anglicismes.
- Le sel, la marée, le dos, l'écaille, le courant, la mémoire : cinq images récurrentes.
- Toujours préférer un verbe à un adjectif : « la carapace s'éveille » plutôt que « nouvelle zone ».

### 13.2 Longueurs

- Titre de carte : 1 à 4 mots.
- Description de bâtiment : 1 phrase, 90 caractères maximum.
- Texte d'événement : 1 à 2 phrases, 160 caractères maximum.
- Choix d'événement : 2 à 5 mots.
- Message de journal : 1 phrase, ton renseigné (info, bon, avertissement, danger, légende).

### 13.3 Nomenclature

- Les tortues portent des noms de deux ou trois syllabes, souvent avec une consonne douce :
  Ammara, Khelon, Orméane, Talassar, Virdos.
- Les baleines : deux syllabes séparées par un tiret (Mhor-Gale, Nhal-Abysse) ou un nom long
  (Le Long Silence).
- Les crabes : noms composés durs, avec K (Bastion-Krabe, Karsk).
- Les raies : noms aériens, avec accent et tréma (Célestine, Aër-Nava).
- Les lieux du joueur sont nommés par lui ; l'interface propose toujours un nom par défaut
  (Havre-d'Écaille, Oroméa).

---

## 14. Direction artistique

- **Matériaux** : cartes marines gravées, laiton patiné, encre noire, papier humide.
- **Couleurs** : vert profond, or vieilli, ivoire, turquoise sombre. Aucun aplat saturé.
- **Formes** : angles vifs (rayons 0 à 2 px), filets d'or, plaques de métal, vignette cinéma.
- **Typographie** : serif pour les titres, sans-serif condensé pour les données. Chiffres romains
  pour les onglets du panneau de commande.
- **Pictogrammes** : un seul tracé, grille 24×24, `stroke="currentColor"`, jamais de glyphe
  typographique. Les symboles sont dessinés dans `src/icons.js` et rendus à la taille du contexte
  (11 px pour les coûts, 16 à 20 px pour les cartes, 26 px pour les modales).
- **Canvas** : la tortue est un dessin procédural (dôme, plaques, tête, pattes) ; la ville pousse
  dessus ; les combats se lisent à la silhouette et aux projectiles.

**Interdits visuels** : dégradés arc-en-ciel, ombres portées douces, arrondis généreux,
illustrations photographiques, polices d'icônes externes.

---

## 15. Son et musique

- **Ambiance** : nappe de mer, souffle de vent, craquements de carapace, cloches lointaines.
- **Signaux** : clic sec (interface), note de quête (récompense), tambour (raid), souffle grave
  (plongée de la tortue).
- **Par âge** : plus de cordes et de chœurs à mesure que la cité grandit ; les Fosses ajoutent un
  bourdon grave.
- **Règle** : tout son est synthétisé (Web Audio), aucun fichier audio externe. Le bouton Son
  coupe l'ambiance et les effets, jamais la musique diégétique d'un événement.

---

## 16. Accessibilité et confort

- Navigation complète au clavier sur la grille (flèches, Entrée, Échap).
- Annonces `aria-live` pour les événements majeurs et les résultats.
- Contrastes vérifiés sur tous les textes d'interface ; la relation n'est jamais indiquée par la
  seule couleur (mot + signe).
- Respect de `prefers-reduced-motion` (projeté) : pas de secousse de caméra, projectiles atténués.
- Tailles de texte et boutons tactiles suffisants ; panneaux repliables sur mobile.
- Sauvegarde locale et export JSON : aucune donnée n'est envoyée à un serveur.

---

## 17. Ce qu'il faut pour un jeu complet

Cette partie est le **plan de travail** issu de l'état réel du projet (version 1.1.0 + refonte
gravée). Elle distingue l'existant, le manquant et les critères de fini.

### 17.1 Existant (à ne pas refaire)

Cinq âges, grille évolutive, 24 bâtiments, 6 terrains, 6 ressources, 15 quêtes, 10 événements,
8 expéditions, 9 mondes procéduraux, 6 ennemis, 8 héritages, 3 difficultés, sauvegarde locale,
export/import, PWA hors ligne, sons procéduraux, interface gravée complète en pictogrammes
dessinés, 16 tests de simulation et un contrôle de release `npm run qa`.

### 17.2 Manques narratifs (priorité haute)

1. **Codex / bible en jeu** : un panneau « Chronique du monde » qui débloque des entrées au fil
   des âges (peuples, bâtiments, ennemis, lieux). Sans lui, tout le lore de ce document reste
   invisible.
2. **Dialogues de personnages** : une bulle par personnage, déclenchée aux âges et aux quêtes, avec
   2 à 3 phrases maximum. Réutiliser le système de modale existant.
3. **Quêtes secondaires** : douze objectifs optionnels répartis sur les actes (un par faction),
   récompensés en perles ou en essence, pour que l'archipel ait une voix.
4. **Fins alternatives** : trois issues de campagne (fédération, conquête, sanctuaire) choisies par
   les héritages accomplis. Le texte de conclusion existe déjà ; il faut le varier.
5. **Épilogue** : une page de chronique exportable (déjà amorcée par le bouton « Exporter la
   chronique ») qui raconte la partie en dix lignes.

### 17.3 Manques systémiques (priorité moyenne)

6. **Sauvegardes multiples** (trois profils locaux) : le jeu n'a qu'un emplacement + autosauvegarde.
7. **Panneau d'options** : volumes, réduction des animations, taille de texte, confirmation des
   actions destructrices.
8. **Graine partageable** : `?seed=…` dans l'URL pour rejouer un archipel identique et comparer.
9. **Statistiques de fin** : temps de jeu, âge atteint, raids, expéditions, héritages, monde le
   plus fidèle. Alimente l'épilogue.
10. **Mode photo** : export PNG de la carapace avec plaque de titre gravée.

### 17.4 Manques de contenu (priorité moyenne)

11. **Bestiaire complet** : 6 ennemis décrits, plus 6 créatures paisibles (lanternes, varech,
    planeur apprivoisé, etc.) pour que la mer soit habitée.
12. **Trois événements par acte** au lieu de dix au total (objectif : 15), en respectant la règle
    « aucun choix évidemment bon ».
13. **Deux expéditions elder** supplémentaires (pèlerinage au sanctuaire, convoi de la Fêlure)
    pour occuper le mode libre.
14. **Succès** (20) : jalons de campagne, exploits de défense, découvertes, fin alternative.

### 17.5 Contrat de cohérence (canon)

Ces invariants doivent être vérifiés à chaque ajout :

- Les cinq âges, leurs grilles (7/11/15/19/21) et leurs plafonds (12/35/80/170/320) ne changent pas.
- Les six ressources et leurs usages (bois, pierre, vivres, essence, perles, mécanismes) restent
  stables ; toute nouvelle ressource exige une entrée dans le lore **et** une icône dessinée.
- Un événement coûte toujours quelque chose ; un bâtiment dit toujours ce qu'il fait à la tortue.
- Aucun pictogramme typographique : tout symbole passe par `src/icons.js`.
- Les noms propres viennent des listes du code ou de l'annexe D, jamais improvisés à l'écran.
- Les grandeurs affichées en jeu sont celles de `src/data.js` ; ce document ne les duplique pas
  au chiffre près, sauf pour les tables de progression.

### 17.6 Définition de « jeu complet »

Un joueur qui n'a jamais entendu parler du projet doit pouvoir, en une session :

1. comprendre la boucle en trois minutes (prologue, objectif courant) ;
2. atteindre le deuxième âge sans lire de documentation externe ;
3. rencontrer au moins trois peuples et deux personnages nommés ;
4. vivre un raid, une expédition et un événement ;
5. terminer la campagne et lire un épilogue qui parle de **sa** partie ;
6. relancer en mode libre avec des objectifs clairs.

Critères techniques : `npm run qa` vert, aucune erreur console sur les parcours bureau et mobile,
sauvegarde/restauration fiable, fonctionnement hors ligne, aucune régression d'accessibilité.

### 17.7 Ordre de production conseillé

| Lot | Contenu | Pourquoi d'abord |
|---|---|---|
| 0 | Commit du travail en cours + correction du précache `sw.js` (module `icons.js` absent) | Sans cela, l'hors-ligne casse et le lore n'a pas de base saine. |
| 1 | Codex en jeu + dialogues de personnages | Rend visible tout le lore déjà écrit ici. |
| 2 | Quêtes secondaires + fins alternatives + épilogue | Transforme la campagne en histoire personnelle. |
| 3 | Options, sauvegardes multiples, graine partageable, statistiques | Confort et rejouabilité. |
| 4 | Contenu additionnel (événements, expéditions, bestiaire, succès) | Remplit le mode libre. |
| 5 | Passe artistique et sonore finale, tests d'accessibilité | Cohérence et finition. |

### 17.8 Risques

- **Dilution** : ajouter du contenu sans codex rend le lore invisible ; le lot 1 est un prérequis.
- **Incohérence de ton** : chaque nouveau texte doit passer la relecture « sel et marée ».
- **Complexité système** : les ajouts doivent rester sans dépendance et sans serveur, sinon le
  contrat « aucune API distante » tombe.
- **Équilibrage** : toute nouvelle ressource ou bâtiment exige un test de simulation, pas seulement
  une relecture.

---

## 18. Annexes

### Annexe A — Lexique

- **Carapace** : la grille de jeu ; aussi le territoire.
- **Écaille** : une case.
- **Plaque** : une zone de terrain d'un seul type.
- **Éveil** : l'évolution d'âge.
- **Essence** : mémoire condensée, ressource spirituelle.
- **Perle** : monnaie d'échange intermondes.
- **Mécanisme** : pièce industrielle (engrenages, poulies, arbalètes).
- **Grand Tour** : circuit des mondes-dos.
- **Fosse** : mer profonde, origine des rejetons.
- **Hauts-Courants** : ciel navigable.
- **Fêlure** : blessure ancienne de la Première Carapace, devenue crête.
- **Monde-dos** : créature assez vieille pour porter une civilisation.
- **Maison** : la cité du joueur, quelle que soit sa taille.

### Annexe B — Chronologie

| Ère | Événement | Trace en jeu |
|---|---|---|
| Le Rêve | La Mer rêve des écailles. | Sanctuaire, sources |
| L'Écaille Première | Naissance des mondes-dos. | Ruines, carte mythique |
| L'Âge des Convois | Perles et routes. | Grand bazar, convoi |
| La Grande Fêlure | Une plaque se brise, les Fosses s'éveillent. | Crête, basaltes, rejetons |
| Les Siècles de Sel | Essor des crabes. | Clans, Forgeurs, bélier |
| L'Ère des Voiles Hautes | Codification du ciel. | Raies, aérodrome, planeurs |
| Aujourd'hui | Le joueur fonde un tortillon. | Partie |

### Annexe C — Table canon ↔ code

| Élément | Où il vit |
|---|---|
| Âges, seuils, grilles | `src/data.js` → `TIERS` |
| Terrains | `src/data.js` → `TERRAIN` |
| Bâtiments et effets | `src/data.js` → `BUILDINGS` |
| Peuples, factions, préférences | `src/data.js` → `WORLD_NODE_ARCHETYPES` |
| Expéditions | `src/data.js` → `EXPEDITIONS` |
| Quêtes | `src/data.js` → `QUESTS` |
| Événements | `src/data.js` → `RANDOM_EVENTS` |
| Ennemis | `src/data.js` → `ENEMY_TYPES` |
| Difficultés et multiplicateurs | `src/state.js` → `createGame` |
| Héritages | `src/main.js` → `LEGACY_GOALS` |
| Pictogrammes | `src/icons.js` |
| Ton visuel | `styles.css`, `src/render.js` |
| Textes de campagne | `src/main.js` → conclusion, prologue |

### Annexe D — Banque de noms et formules

**Noms de tortues** : Ammara, Khelon, Orméane, Talassar, Virdos, Sélune, Ombrage, Thalvéa,
Nacrelle, Quoron.
**Noms de crabes** : Bastion-Krabe, Rouge-Marche, Karsk, Kragne, Sel-Vif.
**Noms de raies** : Célestine, Manta-Lune, Aër-Nava, Zéphyrine, Haute-Écume.
**Noms de lieux** : Havre-d'Écaille, Récif des Lanternes, Passage des Quatre Vents, Fosse Taire,
Jardin de Varech, Crête Fendue.

**Formules** :

- Serment de vigie : « Je regarde tôt, je parle clair, je ne ferme pas l'œil avant la marée. »
- Bénédiction de source : « Que ta mémoire soit plus lourde que ta pierre. »
- Salut de port : « Bonne écume, bon vent, bonne perle. »
- Malédiction des Fosses : « Que ton dos se souvienne de ce que tu as laissé couler. »

**Proverbes** :

- « On ne mesure pas un monde à sa voile, mais à ce qu'il porte. »
- « Le sel ne ment jamais sur le prix. »
- « Une carapace craque là où elle a le plus grandi. »
- « Les courants se souviennent. »
