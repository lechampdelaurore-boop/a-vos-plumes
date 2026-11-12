# À vos plumes

De **vraies dictées de phrases** pour le CM2, sur téléphone ou tablette, 5 à 10 minutes par jour.

👉 **[Ouvrir l'appli](https://lechampdelaurore-boop.github.io/a-vos-plumes/)**

- La voix dicte la phrase entière, puis **par petits groupes de mots**. Sans voix française sur l'appareil, l'enfant lit le groupe de mots, qui se cache dès qu'il tape ; un adulte peut aussi dicter.
- Avant d'écrire, **je prépare** : le texte se lit, puis 2 à 4 pièges en choix (« *a* ou *à* ? »).
- Après avoir écrit, **je me relis** : les mots-pièges de *ma* phrase s'allument un par un, avec la question à se poser (jamais la réponse).
- **Correction mot à mot** : on compte les mots justes, la lettre fausse est marquée, le type d'erreur et une phrase qui explique.
- Les mots ratés se **réécrivent de mémoire** (regarder, cacher, écrire, comparer), et **la phrase ratée revient** le lendemain, puis 3 jours et 7 jours après.

Tout reste sur l'appareil (rien n'est envoyé sur Internet). L'appli marche hors ligne et s'installe sur l'écran d'accueil.

## Les textes

| | Longueur | Repère |
|---|---|---|
| ✏️ Niveau 1 | 25 à 35 mots | phrases courtes au présent, pluriels, *a/à*, *et/est* |
| 📝 Niveau 2 | 40 à 55 mots | imparfait et futur, plus d'homophones |
| 📜 Niveau 3 | 55 à 70 mots | la longueur de la dictée nationale de CM2 (67 mots), surtout à l'imparfait |
| 🏆 Niveau 4 | 80 à 100 mots | une dizaine de lignes écrites à la main, récits au passé simple |

Chaque niveau a 6 textes originaux (histoires et documentaires). Aucun niveau n'est verrouillé ; après 4 textes réussis à 85 % ou plus, l'appli propose le niveau suivant.

**Les dictées de l'école** : les 11 dictées de l'année, selon le groupe de couleur (rouge, jaune, vert, violet). Le groupe rouge fait une dictée à trous sur les mots de la liste ; les autres écrivent tout le texte, avec plus ou moins de phrases. Le groupe choisi dans l'appli « Mots à retenir » est repris tout seul.

**Mes textes** : un parent peut ajouter un texte (la dictée préparée donnée en classe, par exemple). Les mots entourés d'étoiles (`les *enfants* jouent`) deviennent les trous de la dictée à trous.

## Ce qui est corrigé

Les textes visent d'abord ce qui fait chuter les élèves de CM2 : **les accords** (dans le groupe nominal, sujet-verbe, participe passé) et **les fins de verbes**, puis **les homophones** et les mots invariables fréquents.

Types d'erreurs montrés à l'enfant : accord, fin du verbe, participe passé, -é ou -er, homophone, orthographe du mot, mot de ta liste, mot invariable, accent, apostrophe, mots collés, mot coupé, mot oublié, mot en trop. La majuscule est signalée sans compter. Les rectifications de 1990 sont acceptées (*connait* sans accent circonflexe, sauf *dû, mûr, sûr, jeûne* et le passé simple).

## Réglages ⚙

Sons, animations, vibrations, voix lente ; taille des groupes de mots dictés (courts, normaux, phrase entière) ; préparer avant la dictée ; relecture guidée ; qui dicte (la voix, je lis, un adulte). Les animations respectent aussi le réglage « réduire les animations » du téléphone.

Le **carnet du parent** (lien en bas de l'accueil) montre les 14 derniers jours, les erreurs par type sur 7 et 30 jours, les textes faits, les mots ratés récemment, et permet d'ajouter des textes et de copier un résumé.

## Fichiers

- `index.html` : toute l'appli (HTML, CSS et JavaScript, sans bibliothèque), textes, moteur de correction et personnages compris. Les textes sont entre `// DÉBUT TEXTES` et `// FIN TEXTES`, avec des marques pour les pièges (`{chats|n:deux}`) et les groupes de mots (` / `), expliquées dans la [méthode](docs/methode-et-sources.md#écrire-un-texte).
- `sw.js` et `manifest.webmanifest` : mode hors ligne et installation. Après une modification des fichiers de l'appli, changer la valeur de `CACHE` dans `sw.js`.
- `icons/` : icône de l'appli ; `fonts/` : polices Fredoka et Nunito (licence SIL Open Font License, voir les fichiers `OFL-*.txt`).
- `docs/` : le [guide des parents](docs/guide-parents.md) et la [méthode et les sources](docs/methode-et-sources.md).
- `tests/moteur.cjs` : vérifie la correction mot à mot et le type d'erreur sur des phrases d'exemple, qu'une phrase recopiée exactement est juste, et que chaque piège des textes a sa question de relecture (`node tests/moteur.cjs`).
- `tests/textes.cjs` : vérifie tous les textes : marques bien formées, longueur par niveau, groupes de 7 mots au plus, pas de chiffres, codes de pièges connus (`node tests/textes.cjs`).
- `tests/telephone.cjs` et `.github/workflows/test-telephone.yml` : après chaque mise en ligne, GitHub ouvre le site publié dans Chrome au format téléphone (7 tailles d'écran), vérifie que les écrans de dictée tiennent sans défiler, joue des dictées du jour, vérifie les révisions espacées, la correction, un texte ajouté, le mode hors ligne et l'absence d'erreur dans la console. Résultat et captures dans l'onglet Actions. Lancement local : `npm install --no-save playwright && node tests/telephone.cjs http://localhost:8000/`.

## Plus tard

- Dicter la ponctuation (option).
- Une dictée « dialoguée » où l'enfant peut dire son doute pendant qu'il écrit.
- Plus de textes par niveau.
