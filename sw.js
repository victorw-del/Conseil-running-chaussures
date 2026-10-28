/* =========================================================
   SW.JS : LE "SERVICE WORKER" DE L'APPLI
   C'est un petit programme que le navigateur garde de côté.
   Il enregistre une copie des pages du site sur le téléphone :
   l'appli s'ouvre ainsi même sans connexion.
   Il doit rester à la racine du site pour s'occuper de toutes les pages.
   ========================================================= */

/* ---------- 1. Le nom de la copie ----------
   Si tu modifies beaucoup le site, change ce numéro (v2, v3…) :
   l'ancienne copie sera alors effacée et remplacée. */
const NOM_DE_LA_COPIE = "la-chaussure-parfaite-v1";

// Les fichiers enregistrés dès l'installation de l'appli.
const FICHIERS = [
  "./",
  "./index.html",
  "./resultats.html",
  "./css/style.css",
  "./js/app.js",
  "./js/appli.js",
  "./js/recommandation.js",
  "./js/resultats.js",
  "./data/chaussures.json",
  "./manifest.webmanifest",
  "./icones/icone-192.png",
  "./icones/icone-512.png",
  "./images/foulee.svg",
  "./images/coureur.svg"
];


/* ---------- 2. L'installation : on enregistre les fichiers ---------- */
self.addEventListener("install", function (evenement) {
  evenement.waitUntil(
    caches.open(NOM_DE_LA_COPIE).then(function (copie) {
      return copie.addAll(FICHIERS);
    })
  );
  // La nouvelle version prend la place de l'ancienne sans attendre.
  self.skipWaiting();
});


/* ---------- 3. L'activation : on efface les anciennes copies ---------- */
self.addEventListener("activate", function (evenement) {
  evenement.waitUntil(
    caches.keys().then(function (noms) {
      return Promise.all(noms
        .filter(function (nom) { return nom !== NOM_DE_LA_COPIE; })
        .map(function (nom) { return caches.delete(nom); }));
    })
  );
  self.clients.claim();
});


/* ---------- 4. Chaque demande de fichier ----------
   On essaie d'abord Internet, pour avoir toujours la dernière version
   (nouvelles chaussures, nouveaux prix). On range au passage la réponse
   dans la copie. Sans réseau, on sert la copie enregistrée.
   ignoreSearch : resultats.html?sexe=femme… utilise la copie de resultats.html. */
self.addEventListener("fetch", function (evenement) {
  const demande = evenement.request;

  // On ne s'occupe que des fichiers du site lui-même (pas de Google Fonts, par exemple).
  if (demande.method !== "GET" || new URL(demande.url).origin !== self.location.origin) {
    return;
  }

  evenement.respondWith(
    fetch(demande)
      .then(function (reponse) {
        const copieDeLaReponse = reponse.clone();
        caches.open(NOM_DE_LA_COPIE).then(function (copie) {
          copie.put(demande, copieDeLaReponse);
        });
        return reponse;
      })
      .catch(function () {
        return caches.match(demande, { ignoreSearch: true });
      })
  );
});
