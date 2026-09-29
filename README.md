# SA Consulting — Professional Multilingual Website

🌐 **Live website:** https://saconsulting.biz

Professional corporate website developed for **SA Consulting**, a consulting company based in Tunisia.

The website provides a modern, responsive and multilingual digital presence designed to present the company's services and facilitate contact with potential clients.

## 🌍 Multilingual Experience

The website is available in three languages:

- 🇫🇷 French
- 🇬🇧 English
- 🇹🇳 Arabic with full RTL support

Each language has dedicated URLs (`/fr/`, `/en/`, `/ar/`) with multilingual SEO configuration including `hreflang`, canonical URLs and sitemap support.

## ✨ Key Features

- Responsive design for desktop, tablet and mobile
- French, English and Arabic versions
- Full RTL layout support for Arabic
- Professional company and services presentation
- Contact form integration
- WhatsApp contact integration
- LinkedIn integration
- QR-code contact page (`/connect/`)
- SEO optimization
- Multilingual sitemap
- Social media metadata
- Custom 404 page
- Optimized static deployment

## 🛠️ Technologies

**Frontend**

- HTML5
- CSS3
- JavaScript

**Architecture & Tools**

- Node.js
- Custom JavaScript build system
- JSON-based internationalization
- Web3Forms
- Git & GitHub
- Netlify
- Google Search Console

No frontend framework is required. The production website is generated as optimized static files.

## 🏗️ Project Architecture

```text
sa-consulting-website/
├── README.md
├── package.json
├── src/
│   ├── site.config.json
│   ├── i18n/
│   │   ├── fr.json
│   │   ├── en.json
│   │   └── ar.json
│   ├── build.mjs
│   └── icons.mjs
├── public/
│   ├── css/
│   ├── js/
│   ├── images/
│   └── assets/
└── dist/
