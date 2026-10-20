/* =========================================================
   RECOMMANDATION.JS : LE "CERVEAU" PARTAGÉ PAR LES DEUX PAGES
   Ce fichier est chargé à la fois par index.html (le questionnaire)
   et par resultats.html (la page des résultats).
   Partie 1 : charger les chaussures
   Partie 2 : calculer un score pour chaque chaussure
   Partie 3 : garder les 5 meilleures
   ========================================================= */


/* ---------- 1. Combien de chaussures on affiche ----------
   Une "constante" : si un jour tu veux un top 3 ou un top 10,
   il suffit de changer ce chiffre ici. */
const NOMBRE_DE_RESULTATS = 5;


/* ---------- 2. La liste des chaussures ---------- */
let chaussures = [];


/* ---------- 3. Charger le fichier data/chaussures.json ----------
   Renvoie true si le chargement a réussi, false sinon.
   Chaque page décide ensuite elle-même quoi afficher en cas d'erreur. */
async function chargerChaussures() {
  try {
    const reponse = await fetch("data/chaussures.json");
    if (!reponse.ok) {
      throw new Error("Fichier introuvable (code " + reponse.status + ")");
    }
    const toutesLesChaussures = await reponse.json();

    // On ne garde QUE les chaussures vérifiées à la main (verifie: true).
    chaussures = toutesLesChaussures.filter(function (chaussure) {
      return chaussure.verifie === true;
    });

    console.log(chaussures.length + " chaussures chargées :", chaussures);
    return true;

  } catch (erreur) {
    console.error("Impossible de charger les chaussures :", erreur);
    return false;
  }
}


/* =========================================================
   PARTIE 2 : LE CALCUL DE LA RECOMMANDATION
   Principe : chaque chaussure part de 0 point. Chaque règle ajoute des points
   selon qu'elle correspond bien ou non au coureur. Total maximum : 100 points.
   En même temps, on note les "raisons" (les points forts) et les "alertes"
   (les points faibles) : elles servent à écrire l'explication sur chaque carte.
   ========================================================= */


/* ---------- 4. Petits outils ---------- */

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
// Les tranches de poids ne sont pas les mêmes pour les hommes et pour les femmes
// (voir la question 6 dans index.html), mais elles donnent la même échelle d'amorti.
function amortiConseille(reponses) {
  // Un objet sert ici de "table de correspondance" : tranche de poids -> amorti de base.
  const amortiSelonPoids = {
    // Tranches du parcours homme
    moins60: 2, "60a75": 3, "75a90": 4, plus90: 5,
    // Tranches du parcours femme
    moins55: 2, "55a65": 3, "65a80": 4, plus80: 5
  };
  let besoin = amortiSelonPoids[reponses.poids];

  if (reponses.km === "30a50") {
    besoin = besoin + 0.5;
  } else if (reponses.km === "plus50") {
    besoin = besoin + 1;
  }
  return limiter(besoin, 1, 5);
}


/* ---------- 5. Le score d'UNE chaussure ----------
   Renvoie un objet { chaussure, score, raisons, alertes },
   ou null si la chaussure est éliminée (mauvais sexe, mauvais terrain ou trop chère). */
function calculerScore(chaussure, reponses) {
  let score = 0;
  const raisons = [];   // liste des points forts, en phrases
  const alertes = [];   // liste des points faibles, en phrases


  // --- Règle 0 : le sexe (ÉLIMINATOIRE) ---
  // Le champ "sexe" est une liste : ["homme"], ["femme"] ou ["homme", "femme"].
  // Une chaussure sans ce champ reste proposée à tout le monde.
  if (chaussure.sexe && !chaussure.sexe.includes(reponses.sexe)) {
    return null;
  }


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


/* ---------- 6. Le classement complet ----------
   On calcule le score de toutes les chaussures, on retire les éliminées,
   on trie de la meilleure à la moins bonne, et on garde les 5 premières. */
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

  // slice(0, 5) garde les éléments de la position 0 à 4, donc les 5 premiers.
  return retenues.slice(0, NOMBRE_DE_RESULTATS);
}
