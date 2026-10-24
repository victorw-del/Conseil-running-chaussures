/* =========================================================
   RESULTATS.JS : LA PAGE DES RÉSULTATS (page resultats.html)
   1. On relit les réponses dans l'adresse de la page.
   2. On calcule le top 5 avec les fonctions de recommandation.js.
   3. On affiche une carte par chaussure.
   ========================================================= */


/* ---------- 1. Les éléments de la page dont on a besoin ---------- */
const zoneResultats = document.getElementById("resultats");
const titreResultats = document.getElementById("titre-resultats");
const resumeProfil = document.getElementById("resume-profil");


/* ---------- 2. Relire les réponses dans l'adresse ----------
   Le questionnaire nous a envoyés vers une adresse du type
   resultats.html?sexe=femme&niveau=debutant&blessures=genou&blessures=tibia...
   location.search contient la partie après le "?". URLSearchParams sait la lire :
   get() renvoie une réponse, getAll() toutes les réponses d'une même question. */
function lireReponses() {
  const donnees = new URLSearchParams(window.location.search);
  return {
    sexe:      donnees.get("sexe"),
    niveau:    donnees.get("niveau"),
    km:        donnees.get("km"),
    objectif:  donnees.get("objectif"),
    terrain:   donnees.get("terrain"),
    poids:     donnees.get("poids"),
    foulee:    donnees.get("foulee"),
    blessures: donnees.getAll("blessures"),
    sensation: donnees.get("sensation"),
    largeur:   donnees.get("largeur"),
    budget:    donnees.get("budget")
  };
}

// Vérifie que toutes les questions obligatoires ont une réponse.
// (Quelqu'un pourrait ouvrir resultats.html directement, sans passer par le questionnaire.)
function reponsesCompletes(reponses) {
  const obligatoires = ["sexe", "niveau", "km", "objectif", "terrain", "poids", "foulee", "sensation", "largeur", "budget"];
  // every() renvoie true seulement si la condition est vraie pour TOUS les éléments.
  return obligatoires.every(function (question) {
    return reponses[question];
  });
}


/* ---------- 3. Le résumé du profil, en haut de la page ----------
   Des tables de correspondance : valeur technique -> texte lisible. */
const libelles = {
  sexe:     { homme: "Homme", femme: "Femme" },
  terrain:  { route: "Route", trail: "Trail", mixte: "Route et chemins" },
  objectif: { plaisir: "Plaisir et forme", "10km": "5 à 10 km", semi: "Semi-marathon", marathon: "Marathon", ultra: "Trail long ou ultra" },
  foulee:   { neutre: "Foulée neutre", pronateur: "Pronateur", supinateur: "Supinateur", inconnue: "Foulée inconnue" },
  budget:   { "100": "Jusqu'à 100 €", "150": "Jusqu'à 150 €", "200": "Jusqu'à 200 €", illimite: "Budget libre" }
};

function resumeDuProfil(reponses) {
  const morceaux = [
    libelles.sexe[reponses.sexe],
    libelles.terrain[reponses.terrain],
    libelles.objectif[reponses.objectif],
    libelles.foulee[reponses.foulee],
    libelles.budget[reponses.budget]
  ];
  // join(" · ") colle les morceaux avec un point au milieu entre chacun.
  return morceaux.join(" · ");
}


/* ---------- 4. Transformer une liste de phrases en liste HTML ----------
   Exemple : ["A", "B"] devient "<li>A</li><li>B</li>". */
function listeHTML(phrases) {
  return phrases.map(function (phrase) {
    return "<li>" + phrase + "</li>";
  }).join("");
}


/* ---------- 5. Les petits morceaux d'une carte ---------- */

// Une jauge de 5 cases, dont "note" cases colorées. Exemple : jauge("Amorti", 3).
// role="img" et aria-label : un lecteur d'écran lit « Amorti : 3 sur 5 ».
function jauge(nom, note) {
  let cases = "";
  for (let i = 1; i <= 5; i++) {
    cases += `<span class="${i <= note ? "case pleine" : "case"}"></span>`;
  }
  return `
    <div class="jauge">
      <span class="jauge-nom">${nom}</span>
      <span class="jauge-cases" role="img" aria-label="${nom} : ${note} sur 5">${cases}</span>
      <span class="jauge-note">${note}/5</span>
    </div>`;
}

// Les pastilles sous le nom : terrain(s), type et modèle unisexe.
const nomsTerrain = { route: "Route", trail: "Trail", mixte: "Mixte" };

function pastilles(c) {
  const liste = c.terrain.map(function (terrain) {
    return `<span class="pastille pastille-${terrain}">${nomsTerrain[terrain]}</span>`;
  });
  if (c.type === "stable") {
    liste.push(`<span class="pastille pastille-stable">Stable</span>`);
  } else {
    liste.push(`<span class="pastille">Neutre</span>`);
  }
  if (c.unisexe) {
    liste.push(`<span class="pastille">Unisexe</span>`);
  }
  return liste.join("");
}


/* ---------- 6. Fabriquer la carte d'une chaussure ---------- */
function carteChaussure(resultat, position, reponses) {
  const c = resultat.chaussure;

  // Une phrase d'introduction différente selon la place dans le classement.
  const introductions = [
    "Mon premier choix pour toi.",
    "Une excellente alternative.",
    "Une très bonne option aussi.",
    "À essayer si les premières ne te vont pas.",
    "Une dernière piste intéressante."
  ];

  // La photo, seulement si la chaussure en a une.
  let photo = "";
  if (c.image) {
    photo = `<img class="photo-chaussure" src="${c.image}" alt="${c.marque} ${c.modele}" loading="lazy">`;
  }

  // Le lien vers la fiche officielle, seulement s'il est renseigné.
  let lien = "";
  if (c.lien_officiel) {
    lien = `<a class="lien-fiche" href="${c.lien_officiel}" target="_blank" rel="noopener">Voir la fiche officielle</a>`;
  }

  // Le bloc "À savoir" n'apparaît que s'il y a des alertes.
  let blocAlertes = "";
  if (resultat.alertes.length > 0) {
    blocAlertes = `
        <h4>À savoir</h4>
        <ul class="alertes">${listeHTML(resultat.alertes)}</ul>`;
  }

  // Les caractéristiques ont été relevées sur la fiche homme. Pour le parcours femme,
  // on le signale : le poids et parfois le prix du modèle femme sont un peu différents.
  let noteModele = "";
  if (reponses.sexe === "femme" && !c.unisexe) {
    noteModele = `<p class="note-modele">Caractéristiques relevées sur le modèle homme : le modèle femme est en général un peu plus léger.</p>`;
  }

  // Le prix : "160 €" si min et max sont égaux, sinon "140 à 160 €".
  const prix = c.prix.min === c.prix.max ? `${c.prix.min} €` : `${c.prix.min} à ${c.prix.max} €`;

  // La première carte reçoit une classe en plus pour être mise en avant.
  const classePremiere = position === 0 ? " carte-premiere" : "";

  // style="--i: ..." donne au CSS la position de la carte :
  // il s'en sert pour faire apparaître les cartes l'une après l'autre.
  return `
    <article class="carte-resultat${classePremiere}" style="--i: ${position}">
      <div class="carte-entete">
        <span class="rang">${position + 1}</span>
        <div class="carte-nom">
          <p class="marque">${c.marque}</p>
          <h2>${c.modele}</h2>
        </div>
        <p class="prix">${prix}</p>
      </div>
      ${photo}

      <div class="pastilles">
        <span class="score-badge">${resultat.score} % de correspondance</span>
        ${pastilles(c)}
      </div>

      <p class="intro">${introductions[position]}</p>

      <div class="jauges">
        ${jauge("Amorti", c.amorti)}
        ${jauge("Dynamisme", c.dynamisme)}
      </div>

      <dl class="caracteristiques">
        <div><dt>Drop</dt><dd>${c.drop_mm} mm</dd></div>
        <div><dt>Poids</dt><dd>${c.poids_g} g</dd></div>
      </dl>

      <h4>Pourquoi elle te correspond</h4>
      <ul class="raisons">${listeHTML(resultat.raisons)}</ul>
      ${blocAlertes}
      ${noteModele}
      ${lien}
    </article>`;
}


/* ---------- 7. Afficher la page ---------- */
async function afficherPage() {
  const reponses = lireReponses();

  // Cas 1 : il manque des réponses (page ouverte sans passer par le questionnaire).
  if (!reponsesCompletes(reponses)) {
    titreResultats.textContent = "Il manque tes réponses";
    resumeProfil.textContent = "Remplis d'abord le questionnaire pour découvrir tes chaussures.";
    return;
  }

  resumeProfil.textContent = resumeDuProfil(reponses);

  // Cas 2 : le fichier des chaussures n'a pas pu être chargé.
  const chargementReussi = await chargerChaussures();
  if (!chargementReussi || chaussures.length === 0) {
    titreResultats.textContent = "Oups";
    resumeProfil.textContent = "Les chaussures n'ont pas pu être chargées. Recharge la page et réessaie.";
    return;
  }

  const meilleures = recommander(reponses);

  // On garde un petit contrôle dans la console, utile pour vérifier les scores.
  console.table(meilleures.map(function (resultat) {
    return { modele: resultat.chaussure.modele, score: resultat.score };
  }));

  // Cas 3 : aucune chaussure ne convient (budget trop bas, terrain...).
  if (meilleures.length === 0) {
    titreResultats.textContent = "Aucune chaussure trouvée";
    zoneResultats.innerHTML = `
      <p class="aucun-resultat">Aucune chaussure de notre sélection ne correspond à tous tes critères.
      Essaie d'augmenter ton budget ou de choisir le terrain « mixte ».</p>`;
    return;
  }

  // Cas 4 : tout va bien, une carte par chaussure.
  // Le titre s'adapte s'il y a moins de 5 chaussures (budget serré par exemple).
  if (meilleures.length === 1) {
    titreResultats.textContent = "Ta chaussure idéale";
  } else {
    titreResultats.textContent = `Tes ${meilleures.length} chaussures idéales`;
  }

  const cartes = meilleures.map(function (resultat, position) {
    return carteChaussure(resultat, position, reponses);
  }).join("");

  zoneResultats.innerHTML = `
    ${cartes}
    <p class="conseil-essai">Conseil de vendeur : essaie toujours une chaussure avant de l'acheter,
    de préférence en fin de journée, quand le pied est un peu gonflé.</p>`;

  // On place le "focus" sur le titre : une personne qui navigue au clavier
  // ou avec un lecteur d'écran arrive directement sur les résultats.
  titreResultats.focus();
}


/* ---------- 8. Démarrage ---------- */
afficherPage();
