# Le Manuscrit

Une petite pièce sombre en 3D (Three.js) : quelqu'un écrit à la plume sous une lampe.
Un seul bouton, « je suis Zoé » : il pose sa plume, se retourne sur son tabouret
et tend son manuscrit, dont le texte s'écrit ensuite à l'encre.

## Changer le texte

Tout est dans `js/manuscrit.js`. Une ligne vide = nouveau paragraphe ;
la première ligne est la salutation, la dernière est alignée à droite (signature).

## Lancer en local

Les modules JavaScript demandent un petit serveur :

```
npx serve .
```

## Fichiers

- `js/main.js` : la pièce, les lumières, le post-traitement sépia, la chorégraphie
- `js/character.js` : le personnage (bras et jambes en cinématique inverse)
- `js/textures.js` : bois, plâtre, papiers manuscrits, ciel de nuit (générés en code)
- `js/audio.js` : sons d'ambiance synthétisés (horloge, plume, papier, tabouret)
- `vendor/three` : Three.js r160 (MIT), `fonts/` : Caveat (OFL)

Ajouter `#debug` à l'URL saute le fondu d'ouverture.
