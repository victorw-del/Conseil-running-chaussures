/* =========================================================
   APP.JS : LA LOGIQUE DU SITE
   Partie 1 : charger les chaussures et lire les réponses
   Partie 2 : calculer un score pour chaque chaussure
   Partie 3 : afficher les 3 meilleures dans la page
   ========================================================= */


/* ---------- 1. Les éléments de la page dont on a besoin ---------- */
const formulaire = document.getElementById("formulaire");
const zoneResultats = document.getElementById("resultats");


/* ---------- 2. La liste des chaussures ---------- */
let chaussures = [];


/* ---------- 3. Charger le fichier data/chaussures.json ---------- */
async function chargerChaussures() {
  try {
    const reponse = await fetch("data/chaussures.json");
    if (!reponse.ok) {
      throw new Error("Fichier introuvable (code " + reponse.status + ")");
    }
    const toutesLesChaussures = await reponse.json();

    // On ne garde que les chaussures vérifiées... ou les exemples (pendant le développement).
    chaussures = toutesLesChaussures.filter(function (chaussure) {
      return chaussure.verifie === true || chaussure.exemple === true;
    });

    console.log(chaussures.length + " chaussures chargées :", chaussures);

  } catch (erreur) {
    console.error("Impossible de charger les chaussures :", erreur);
    zoneResultats.innerHTML = "<h2>Oups</h2><p>Les chaussures n'ont pas pu être chargées. Réessaie dans un instant.</p>";
  }
}


/* ---------- 4. Lire les réponses du questionnaire ---------- */
function lireReponses() {
  const donnees = new FormData(formulaire);
  return {
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


/* =========================================================
   PARTIE 2 : LE CALCUL DE LA RECOMMANDATION
   Principe : chaque chaussure part de 0 point. Chaque règle ajoute des points
   selon qu'elle correspond bien ou non au coureur. Total maximum : 100 points.
   En même temps, on note les "raisons" (les points forts) et les "alertes"
   (les points faibles) : elles serviront à écrire l'explication à l'étape 9.
   ========================================================= */


/* ---------- 5. Petits outils ---------- */

// Limite un nombre entre un minimum et un maximum.
// Exemple : limiter(7, 0, 5) renvoie 5 ; limiter(-2, 0, 5) renvoie 0.
function limiter(nombre, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, nombre));
}

// Transforme la réponse "budget" en nombre d'euros.
// "illimite" devient Infinity (l'infini) : n'importe quel prix est alors accepté.
function budgetEnEuros(budget) {
  if (budget === "illimite") {
    return Infinity;
  }
  return Number(budget); // Number("150") donne le nombre 150
}

// Calcule l'amorti dont le coureur a besoin, sur une échelle de 1 à 5.
// Plus on est lourd et plus on court, plus il faut d'amorti.
function amortiConseille(reponses) {
  // Un objet sert ici de "table de correspondance" : poids -> amorti de base.
  const amortiSelonPoids = { moins60: 2, "60a75": 3, "75a90": 4, plus90: 5 };
  let besoin = amortiSelonPoids[reponses.poids];

  if (reponses.km === "30a50") {
    besoin = besoin + 0.5;
  } else if (reponses.km === "plus50") {
    besoin = besoin + 1;
  }
  return limiter(besoin, 1, 5);
}


/* ---------- 6. Le score d'UNE chaussure ----------
   Renvoie un objet { chaussure, score, raisons, alertes },
   ou null si la chaussure est éliminée (mauvais terrain ou trop chère). */
function calculerScore(chaussure, reponses) {
  let score = 0;
  const raisons = [];   // liste des points forts, en phrases
  const alertes = [];   // liste des points faibles, en phrases


  // --- Règle 1 : le budget (ÉLIMINATOIRE) ---
  // Si même le prix le plus bas dépasse le budget, on écarte la chaussure.
  if (chaussure.prix.min > budgetEnEuros(reponses.budget)) {
    return null; // "return" arrête la fonction tout de suite
  }


  // --- Règle 2 : le terrain (20 points, ÉLIMINATOIRE si incompatible) ---
  // includes() vérifie si une liste contient une valeur.
  if (chaussure.terrain.includes(reponses.terrain)) {
    score = score + 20;
    raisons.push("Elle est conçue pour le terrain sur lequel tu cours le plus.");
  } else if (reponses.terrain === "mixte") {
    // Un coureur "mixte" peut quand même porter une route ou une trail, avec moins de points.
    score = score + 8;
    alertes.push("Elle est pensée pour un seul type de terrain, alors que tu alternes.");
  } else {
    return null; // une chaussure de route pour un traileur (ou l'inverse) : éliminée
  }


  // --- Règle 3 : la foulée et le type neutre / stable (20 points) ---
  if (reponses.foulee === "pronateur") {
    if (chaussure.type === "stable") {
      score = score + 20;
      raisons.push("Son système de stabilité limite l'affaissement de ton pied vers l'intérieur.");
    } else {
      score = score + 5;
      alertes.push("C'est une chaussure neutre : elle soutient peu un pied pronateur.");
    }
  } else if (reponses.foulee === "neutre" || reponses.foulee === "supinateur") {
    if (chaussure.type === "neutre") {
      score = score + 20;
      raisons.push("C'est une chaussure neutre, qui laisse ton pied se dérouler naturellement.");
    } else {
      score = score + 5;
      alertes.push("Son système de stabilité n'est pas utile pour ta foulée.");
    }
  } else {
    // "Je ne sais pas" : une neutre convient à la majorité des coureurs.
    if (chaussure.type === "neutre") {
      score = score + 15;
    } else {
      score = score + 12;
    }
  }


  // --- Règle 4 : l'amorti adapté au poids et au kilométrage (15 points) ---
  // Math.abs() donne l'écart sans le signe : Math.abs(3 - 5) = 2.
  // Chaque niveau d'écart fait perdre 5 points.
  const besoin = amortiConseille(reponses);
  const ecartAmorti = Math.abs(chaussure.amorti - besoin);
  score = score + limiter(15 - ecartAmorti * 5, 0, 15);
  if (ecartAmorti <= 0.5) {
    raisons.push("Son amorti est bien dosé pour ton gabarit et ton volume de course.");
  } else if (chaussure.amorti < besoin - 1) {
    alertes.push("Son amorti est un peu juste pour ton gabarit et tes kilomètres.");
  }


  // --- Règle 5 : les sensations recherchées (15 points) ---
  let ecartSensation;
  if (reponses.sensation === "amorti") {
    ecartSensation = 5 - chaussure.amorti;          // idéal : amorti 5
  } else if (reponses.sensation === "dynamisme") {
    ecartSensation = 5 - chaussure.dynamisme;       // idéal : dynamisme 5
  } else {
    ecartSensation = Math.abs(chaussure.amorti - 3) + Math.abs(chaussure.dynamisme - 3); // idéal : 3 et 3
  }
  score = score + limiter(15 - ecartSensation * 4, 0, 15);
  if (ecartSensation <= 1) {
    raisons.push("Elle offre exactement les sensations que tu recherches.");
  }


  // --- Règle 6 : l'objectif (15 points) ---
  if (chaussure.usage.includes(reponses.objectif)) {
    score = score + 15;
    raisons.push("Elle est faite pour ton objectif de course.");
  } else {
    alertes.push("Ce n'est pas sa spécialité pour ton objectif.");
  }


  // --- Règle 7 : la largeur du pied (5 points) ---
  if (reponses.largeur === "large") {
    if (chaussure.largeur_disponible.includes("large")) {
      score = score + 5;
      raisons.push("Elle existe en version large, pour ne pas te sentir serré.");
    } else {
      alertes.push("Elle n'existe pas en version large : essaie-la avant d'acheter.");
    }
  } else {
    score = score + 5; // pied normal ou "je ne sais pas" : pas de contrainte
  }


  // --- Règle 8 : le niveau (5 points) ---
  if (reponses.niveau === "debutant" && chaussure.amorti >= 3) {
    score = score + 5;
    raisons.push("Elle est confortable et tolérante, idéale pour progresser sans te blesser.");
  } else if (reponses.niveau === "confirme" && chaussure.dynamisme >= 4) {
    score = score + 5;
    raisons.push("Son dynamisme t'aidera à travailler ta vitesse.");
  } else if (reponses.niveau === "intermediaire") {
    score = score + 5;
  }


  // --- Règle 9 : les blessures passées (5 points) ---
  // Pour chaque blessure cochée, on vérifie si la chaussure est plutôt adaptée.
  // forEach() exécute la fonction pour chaque élément de la liste.
  let pointsBlessures = 5;
  reponses.blessures.forEach(function (blessure) {
    if (blessure === "achille" && chaussure.drop_mm < 8) {
      pointsBlessures = pointsBlessures - 3;
      alertes.push("Son drop assez bas sollicite davantage le tendon d'Achille.");
    }
    if ((blessure === "genou" || blessure === "tibia" || blessure === "plantaire") && chaussure.amorti < 3) {
      pointsBlessures = pointsBlessures - 3;
      alertes.push("Son amorti ferme est peu recommandé après ce type de douleur.");
    }
    if (blessure === "cheville" && chaussure.type !== "stable") {
      pointsBlessures = pointsBlessures - 2;
    }
  });
  score = score + limiter(pointsBlessures, 0, 5);


  // Math.round() arrondit à l'entier le plus proche.
  return {
    chaussure: chaussure,
    score: Math.round(score),
    raisons: raisons,
    alertes: alertes
  };
}


/* ---------- 7. Le classement complet ----------
   On calcule le score de toutes les chaussures, on retire les éliminées,
   on trie de la meilleure à la moins bonne, et on garde les 3 premières. */
function recommander(reponses) {
  // map() crée une nouvelle liste en appliquant calculerScore à chaque chaussure.
  const resultats = chaussures.map(function (chaussure) {
    return calculerScore(chaussure, reponses);
  });

  // On enlève les chaussures éliminées (celles pour qui calculerScore a renvoyé null).
  const retenues = resultats.filter(function (resultat) {
    return resultat !== null;
  });

  // sort() trie la liste. Si (b.score - a.score) est positif, b passe devant a :
  // on obtient donc un tri du plus grand score au plus petit.
  retenues.sort(function (a, b) {
    return b.score - a.score;
  });

  // slice(0, 3) garde les éléments de la position 0 à 2, donc les 3 premiers.
  return retenues.slice(0, 3);
}


/* =========================================================
   PARTIE 3 : L'AFFICHAGE DES RÉSULTATS
   ========================================================= */


/* ---------- 8. Transformer une liste de phrases en liste HTML ----------
   Exemple : ["A", "B"] devient "<li>A</li><li>B</li>".
   join("") colle tous les morceaux ensemble, sans rien entre eux. */
function listeHTML(phrases) {
  return phrases.map(function (phrase) {
    return "<li>" + phrase + "</li>";
  }).join("");
}


/* ---------- 9. Fabriquer la "carte" HTML d'une chaussure ----------
   On utilise des accents graves ` ` (AltGr + 7 sur un clavier français) :
   ils permettent d'écrire du texte sur plusieurs lignes et d'y insérer
   des valeurs avec ${...}. C'est bien plus lisible que d'enchaîner des +. */
function carteChaussure(resultat, position) {
  const c = resultat.chaussure;

  // Une phrase d'introduction différente selon la place dans le classement.
  const introductions = [
    "Mon premier choix pour toi.",
    "Une excellente alternative.",
    "Une autre option à essayer."
  ];

  // Le lien vers la fiche officielle, seulement s'il est renseigné.
  // Si lien_officiel est vide (""), on n'affiche rien.
  let lien = "";
  if (c.lien_officiel !== "") {
    lien = `<a class="lien-fiche" href="${c.lien_officiel}" target="_blank" rel="noopener">Voir la fiche officielle</a>`;
  }

  // Un badge pour signaler clairement les chaussures fictives.
  let badge = "";
  if (c.exemple === true) {
    badge = `<span class="badge-exemple">Donnée fictive</span>`;
  }

  // Le bloc "À savoir" n'apparaît que s'il y a des alertes.
  let blocAlertes = "";
  if (resultat.alertes.length > 0) {
    blocAlertes = `
      <h4>À savoir</h4>
      <ul class="alertes">${listeHTML(resultat.alertes)}</ul>`;
  }

  return `
    <article class="carte-chaussure">
      <div class="carte-entete">
        <span class="rang">${position + 1}</span>
        <div>
          <p class="marque">${c.marque} ${badge}</p>
          <h3>${c.modele}</h3>
        </div>
        <span class="score">${resultat.score} %</span>
      </div>

      <p class="intro">${introductions[position]}</p>

      <h4>Pourquoi elle te correspond</h4>
      <ul class="raisons">${listeHTML(resultat.raisons)}</ul>
      ${blocAlertes}

      <dl class="caracteristiques">
        <div><dt>Type</dt><dd>${c.type === "stable" ? "Stable" : "Neutre"}</dd></div>
        <div><dt>Amorti</dt><dd>${c.amorti} / 5</dd></div>
        <div><dt>Drop</dt><dd>${c.drop_mm} mm</dd></div>
        <div><dt>Poids</dt><dd>${c.poids_g} g</dd></div>
        <div><dt>Prix</dt><dd>${c.prix.min} à ${c.prix.max} €</dd></div>
      </dl>
      ${lien}
    </article>`;
}


/* ---------- 10. Afficher les résultats dans la section #resultats ---------- */
function afficherResultats(meilleures) {
  // Cas 1 : la liste des chaussures est vide, le chargement a échoué.
  // On ne dit pas "aucune chaussure ne te correspond" : ce serait faux.
  if (chaussures.length === 0) {
    zoneResultats.innerHTML = `
      <h2 tabindex="-1">Oups</h2>
      <p>Les chaussures n'ont pas encore pu être chargées. Recharge la page et réessaie.</p>`;
    zoneResultats.querySelector("h2").focus();
    return;
  }

  // Le bouton pour revenir au questionnaire, affiché dans les deux cas suivants.
  // type="button" : ce bouton ne doit PAS envoyer le formulaire.
  const boutonModifier = `<button type="button" class="bouton-secondaire" id="bouton-modifier">Modifier mes réponses</button>`;

  if (meilleures.length === 0) {
    // Cas 2 : aucune chaussure ne convient (budget trop bas, terrain...).
    zoneResultats.innerHTML = `
      <h2 tabindex="-1">Tes chaussures recommandées</h2>
      <p>Aucune chaussure de notre sélection ne correspond à tous tes critères.
      Essaie d'augmenter ton budget ou de choisir le terrain « mixte ».</p>
      ${boutonModifier}`;
  } else {
    // Cas 3 : on a des résultats, on fabrique une carte par chaussure.
    const cartes = meilleures.map(function (resultat, position) {
      return carteChaussure(resultat, position);
    }).join("");

    zoneResultats.innerHTML = `
      <h2 tabindex="-1">Tes chaussures recommandées</h2>
      ${cartes}
      <p class="conseil-essai">Conseil de vendeur : essaie toujours une chaussure avant de l'acheter,
      de préférence en fin de journée, quand le pied est un peu gonflé.</p>
      ${boutonModifier}`;
  }

  // Le bouton vient d'être créé : on lui dit quoi faire quand on clique dessus.
  // Ici : remonter en douceur jusqu'au questionnaire. Les réponses restent remplies.
  document.getElementById("bouton-modifier").addEventListener("click", function () {
    formulaire.scrollIntoView({ behavior: "smooth" });
  });

  // On fait défiler jusqu'aux résultats, et on place le "focus" sur le titre.
  // Le focus, c'est l'endroit où se trouve le clavier. Ainsi, une personne qui navigue
  // au clavier ou avec un lecteur d'écran arrive directement sur les résultats.
  // tabindex="-1" (dans le HTML ci-dessus) autorise un titre à recevoir le focus.
  const titre = zoneResultats.querySelector("h2");
  titre.focus({ preventScroll: true });
  zoneResultats.scrollIntoView({ behavior: "smooth" });
}


/* ---------- 11. Réagir au clic sur "Voir mes chaussures" ---------- */
formulaire.addEventListener("submit", function (evenement) {
  evenement.preventDefault();

  const reponses = lireReponses();
  const meilleures = recommander(reponses);

  // On garde un petit contrôle dans la console, utile pour vérifier les scores.
  console.table(meilleures.map(function (resultat) {
    return { modele: resultat.chaussure.modele, score: resultat.score };
  }));

  afficherResultats(meilleures);
});


/* ---------- 12. Démarrage ---------- */
chargerChaussures();