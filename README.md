# SA Consulting — site web

Site vitrine de **SA Consulting** (saconsulting.biz) en français, anglais et arabe.
HTML, CSS et JavaScript sans framework. Le site publié est entièrement statique.

## Structure

```
sa-consulting-website/
├── README.md               documentation (non publiée)
├── package.json            commandes npm
├── src/                    sources (non publiées)
│   ├── site.config.json    coordonnées, URL du site, LinkedIn
│   ├── i18n/fr.json        textes français
│   ├── i18n/en.json        textes anglais
│   ├── i18n/ar.json        textes arabes
│   ├── build.mjs           génération des pages
│   └── icons.mjs           icônes SVG
├── public/                 fichiers statiques copiés tels quels dans dist/
│   ├── css/style.css
│   ├── js/main.js          menu, langue, formulaire, animations
│   ├── js/config.js        clé du formulaire et lien de réservation
│   ├── images/             logo, image de partage
│   ├── assets/fonts/       polices (Plus Jakarta Sans, Inter, IBM Plex Sans Arabic)
│   └── favicon, .htaccess
└── dist/                   SITE À METTRE EN LIGNE (généré)
```

Chaque langue possède ses propres URL (`/fr/`, `/en/`, `/ar/`) avec `lang`, `dir="rtl"` pour l'arabe,
balises `hreflang` et sitemap multilingue. La racine `/` redirige vers la langue choisie par le visiteur
(français par défaut).

## Commandes

Node.js 18 ou plus récent.

| Commande | Rôle |
|---|---|
| `npm run build` | régénère `dist/` à partir de `src/` et `public/` (aucune dépendance) |
| `npm run serve` | aperçu local sur http://localhost:8000 (Python 3) |

On peut aussi ouvrir directement `dist/index.html` dans le navigateur.

## Modifier le contenu

- **Textes** : `src/i18n/fr.json`, `en.json`, `ar.json`, puis `npm run build`.
  Ne pas modifier les fichiers de `dist/` : ils sont écrasés à chaque génération.
- **Coordonnées, LinkedIn** : `src/site.config.json`, puis `npm run build`.
  Les liens email, téléphone et WhatsApp, le pied de page, le Schema.org et les mentions légales sont mis à jour partout.
- **Messages WhatsApp préremplis** : clé `whatsappMessage` de chaque fichier de langue.

## Formulaire de contact

Les demandes sont envoyées à `contact@saconsulting.biz` via **Web3Forms**.

1. Sur https://web3forms.com, créer une clé d'accès avec l'adresse `contact@saconsulting.biz`.
2. Coller la clé dans `public/js/config.js` (`accessKey`), puis `npm run build`.
3. Envoyer une demande de test depuis le site en ligne et vérifier sa réception.

L'offre gratuite couvre 250 envois par mois. La clé Web3Forms n'est pas un secret : elle ne permet que
l'envoi vers l'adresse propriétaire. Protections : champ piège, délai minimal de saisie, filtrage Web3Forms
(hCaptcha activable dans leur tableau de bord). Le message de confirmation ne s'affiche que si l'envoi est confirmé ;
sans clé ou en cas d'erreur, le visiteur est orienté vers l'email ou WhatsApp.

## Prise de rendez-vous

`public/js/config.js` → `booking.url` : coller un lien Calendly, Google Agenda ou autre.
Vide, les boutons « Prendre rendez-vous » mènent au formulaire.

## Page de contact rapide `/connect/`

Page destinée au QR code des cartes de visite : `https://saconsulting.biz/connect/` (URL permanente, ne pas renommer).
Générée par `npm run build` (fonction `connectPage` dans `src/build.mjs`), textes dans la clé `connect` de chaque
fichier `src/i18n/*.json`, styles dans `public/css/connect.css`. Français par défaut ; FR / EN / AR sélectionnables
sur la page (`?lang=en` ou `?lang=ar` possible dans l'URL).

## Mise en ligne

Publier **uniquement le contenu du dossier `dist/`** à la racine du domaine.

- Hébergement cPanel : copier le contenu de `dist/` dans `public_html/` (le `.htaccess` gère la page 404 et le cache).
- Netlify, Cloudflare Pages ou Vercel : dossier de publication `dist`, commande de build `npm run build`.
- Activer le HTTPS. Les URL canoniques utilisent `https://saconsulting.biz` (sans `www`) ;
  rediriger `www.saconsulting.biz` vers cette adresse.
- Déclarer `https://saconsulting.biz/sitemap.xml` dans Google Search Console.

## Informations à compléter avant publication

Dans `src/i18n/*.json` (les trois langues), remplacer les valeurs `null` :

- `legal` : raison sociale, forme juridique, identifiant unique / RNE, matricule fiscal,
  adresse du siège, responsable de la publication, hébergeur et son adresse ;
- `privacyPage` : adresse du responsable du traitement, durée de conservation des demandes.

Tant qu'une valeur manque, la page concernée affiche « Information à compléter avant publication »,
porte la balise `noindex` et n'apparaît pas dans le sitemap.
