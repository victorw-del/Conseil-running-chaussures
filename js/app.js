/* =========================================================
   APP.JS : LE QUESTIONNAIRE (page index.html)
   Le calcul se trouve dans recommandation.js, et l'affichage
   des résultats dans resultats.js (page resultats.html).
   Ici, on s'occupe seulement :
   - d'afficher les questions une par une, avec un glissement entre chacune ;
   - d'adapter les tranches de poids au parcours homme ou femme ;
   - de remplir la barre de progression au fil des réponses ;
   - d'envoyer les réponses vers la page des résultats.
   ========================================================= */


/* ---------- 1. Les éléments de la page dont on a besoin ---------- */
const formulaire = document.getElementById("formulaire");
const suiteQuestions = document.getElementById("suite-questions");
const listePoids = document.getElementById("poids");
const progression = document.getElementById("progression");
const progressionTexte = document.getElementById("progression-texte");
const progressionBarre = document.getElementById("progression-barre");
const navigation = document.getElementById("navigation-etapes");
const boutonPrecedent = document.getElementById("bouton-precedent");
const boutonSuivant = document.getElementById("bouton-suivant");
const boutonEnvoyer = document.getElementById("bouton-envoyer");
const zoneQuestionnaire = document.getElementById("questionnaire");

// Chaque <fieldset> est une question : ce sont les étapes du questionnaire.
const etapes = Array.from(formulaire.querySelectorAll("fieldset"));

// Si la personne a demandé moins d'animations dans les réglages de son appareil,
// les questions changent tout de suite, sans glissement.
const mouvementReduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const DUREE_SORTIE = mouvementReduit ? 0 : 240;      // en millisecondes
const PAUSE_AVANT_SUITE = mouvementReduit ? 150 : 420; // le temps de voir la réponse choisie


/* ---------- 2. Les tranches de poids de chaque parcours ----------
   Les femmes sont en moyenne plus légères : on décale les tranches pour que
   chacune corresponde au même besoin d'amorti (voir amortiConseille). */
const tranchesDePoids = {
  homme: [
    { valeur: "moins60", texte: "Moins de 60 kg" },
    { valeur: "60a75",   texte: "De 60 à 75 kg" },
    { valeur: "75a90",   texte: "De 75 à 90 kg" },
    { valeur: "plus90",  texte: "Plus de 90 kg" }
  ],
  femme: [
    { valeur: "moins55", texte: "Moins de 55 kg" },
    { valeur: "55a65",   texte: "De 55 à 65 kg" },
    { valeur: "65a80",   texte: "De 65 à 80 kg" },
    { valeur: "plus80",  texte: "Plus de 80 kg" }
  ]
};


/* ---------- 3. Préparer le questionnaire selon le sexe choisi ---------- */
function preparerParcours(sexe) {
  // On garde le poids déjà choisi s'il existe aussi dans le nouveau parcours.
  const poidsChoisi = listePoids.value;

  // On remplit la liste déroulante du poids avec les tranches du bon parcours.
  // La première option, vide, oblige toujours à faire un vrai choix.
  const options = tranchesDePoids[sexe].map(function (tranche) {
    return `<option value="${tranche.valeur}">${tranche.texte}</option>`;
  }).join("");
  listePoids.innerHTML = `<option value="">Choisis une réponse</option>` + options;
  listePoids.value = poidsChoisi;
  if (listePoids.value !== poidsChoisi) {
    listePoids.value = "";
  }
}


/* ---------- 4. Savoir si une question a sa réponse ----------
   La question sur les blessures (cases à cocher) est facultative :
   elle compte toujours comme répondue. */
function estRepondue(etape) {
  const champ = etape.querySelector("input, select");
  if (champ.type === "checkbox") {
    return true;
  }
  return Boolean(new FormData(formulaire).get(champ.name));
}


/* ---------- 5. La barre de progression et les boutons ---------- */
let etapeActuelle = 0;

function mettreAJourNavigation() {
  const total = etapes.length;
  const derniere = etapeActuelle === total - 1;

  // On compte les questions déjà passées, plus celle en cours si elle a sa réponse.
  const faites = etapeActuelle + (estRepondue(etapes[etapeActuelle]) ? 1 : 0);
  progressionTexte.textContent = `Question ${etapeActuelle + 1} sur ${total}`;
  progressionBarre.style.width = `${(faites / total) * 100}%`;

  // "Précédent" est invisible sur la première question (mais garde sa place).
  boutonPrecedent.classList.toggle("invisible", etapeActuelle === 0);

  // Sur la dernière question, "Suivant" laisse sa place à "Voir mes chaussures".
  boutonSuivant.hidden = derniere;
  boutonEnvoyer.hidden = !derniere;

  // On ne peut avancer que si la question a sa réponse.
  boutonSuivant.disabled = !estRepondue(etapes[etapeActuelle]);
  boutonEnvoyer.classList.toggle("pret", derniere && estRepondue(etapes[etapeActuelle]));
}


/* ---------- 6. Passer d'une question à l'autre ----------
   L'ancienne question glisse et s'efface, puis la nouvelle arrive de l'autre côté.
   Le sens du glissement dépend du sens : vers l'avant ou vers l'arrière. */
function allerA(index) {
  if (index === etapeActuelle || index < 0 || index >= etapes.length) {
    return;
  }
  const sens = index > etapeActuelle ? "avance" : "recule";
  const ancienne = etapes[etapeActuelle];
  const nouvelle = etapes[index];
  etapeActuelle = index;

  // 1. L'ancienne question sort.
  ancienne.classList.remove("entree-avance", "entree-recule");
  ancienne.classList.add("sortie-" + sens);

  // 2. Une fois sortie, on la cache et on fait entrer la nouvelle.
  setTimeout(function () {
    ancienne.hidden = true;
    ancienne.classList.remove("sortie-avance", "sortie-recule");
    etapes.forEach(function (etape) {
      if (etape !== nouvelle) {
        etape.hidden = true;
      }
    });
    nouvelle.hidden = false;
    nouvelle.classList.add("entree-" + sens);
    mettreAJourNavigation();

    // Si le haut du questionnaire est sorti de l'écran (téléphone), on y remonte.
    if (zoneQuestionnaire.getBoundingClientRect().top < 0) {
      zoneQuestionnaire.scrollIntoView({ behavior: mouvementReduit ? "auto" : "smooth" });
    }
    // Le focus va sur la nouvelle question : un lecteur d'écran la lit tout de suite.
    nouvelle.focus({ preventScroll: true });
  }, DUREE_SORTIE);
}


/* ---------- 7. Mettre le questionnaire en route ---------- */
function demarrer() {
  // La classe "mode-etapes" active la présentation question par question dans le CSS.
  formulaire.classList.add("mode-etapes");
  // Le formulaire ne vérifie plus tout seul les réponses : on le fait question par question.
  formulaire.noValidate = true;
  suiteQuestions.hidden = false;
  progression.hidden = false;
  navigation.hidden = false;
  // Le bouton "Voir mes chaussures" rejoint "Précédent" et "Suivant".
  navigation.append(boutonEnvoyer);

  // Si le navigateur a gardé des réponses (bouton "Retour"), on reprend
  // à la première question sans réponse.
  const sexeDejaCoche = document.querySelector('input[name="sexe"]:checked');
  if (sexeDejaCoche) {
    preparerParcours(sexeDejaCoche.value);
  }
  const premiereSansReponse = etapes.findIndex(function (etape) {
    return !estRepondue(etape);
  });
  etapeActuelle = premiereSansReponse === -1 ? etapes.length - 1 : premiereSansReponse;

  etapes.forEach(function (etape, index) {
    etape.hidden = index !== etapeActuelle;
    // tabindex="-1" : la question peut recevoir le focus quand elle apparaît.
    etape.tabIndex = -1;
  });
  mettreAJourNavigation();
}


/* ---------- 8. Réagir aux réponses ----------
   Après un clic sur une réponse, on passe tout seul à la question suivante.
   Mais pas si la personne parcourt les réponses avec les flèches du clavier :
   elle avance alors avec le bouton "Suivant". */
let viaFleches = false;
formulaire.addEventListener("keydown", function (evenement) {
  viaFleches = evenement.key.startsWith("Arrow");
});
formulaire.addEventListener("pointerdown", function () {
  viaFleches = false;
});

formulaire.addEventListener("change", function (evenement) {
  const champ = evenement.target;
  if (champ.name === "sexe") {
    preparerParcours(champ.value);
  }
  mettreAJourNavigation();

  const avanceSeule = !viaFleches && (champ.type === "radio" || champ.tagName === "SELECT");
  const depuis = etapeActuelle;
  if (avanceSeule && depuis < etapes.length - 1 && champ.value) {
    setTimeout(function () {
      // On n'avance que si la personne n'a pas déjà changé de question entre-temps.
      if (etapeActuelle === depuis) {
        allerA(depuis + 1);
      }
    }, PAUSE_AVANT_SUITE);
  }
});

boutonSuivant.addEventListener("click", function () {
  allerA(etapeActuelle + 1);
});

boutonPrecedent.addEventListener("click", function () {
  allerA(etapeActuelle - 1);
});


/* ---------- 9. Envoyer les réponses ----------
   On part vers resultats.html en emportant les réponses dans l'adresse de la page.
   Exemple : resultats.html?sexe=femme&niveau=debutant&km=15a30...
   URLSearchParams fabrique cette fin d'adresse à partir du formulaire. */
formulaire.addEventListener("submit", function (evenement) {
  evenement.preventDefault();

  // La touche Entrée sur une question (pas la dernière) passe simplement à la suivante.
  if (etapeActuelle < etapes.length - 1) {
    if (estRepondue(etapes[etapeActuelle])) {
      allerA(etapeActuelle + 1);
    }
    return;
  }

  // S'il manque une réponse quelque part, on y retourne.
  const manquante = etapes.findIndex(function (etape) {
    return !estRepondue(etape);
  });
  if (manquante !== -1) {
    allerA(manquante);
    return;
  }

  const adresse = "resultats.html?" + new URLSearchParams(new FormData(formulaire)).toString();
  // partirVers (dans effets.js) fait un fondu avant de changer de page.
  if (window.partirVers) {
    window.partirVers(adresse);
  } else {
    window.location.href = adresse;
  }
});


/* ---------- 10. Démarrage ---------- */
demarrer();
