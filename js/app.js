/* =========================================================
   APP.JS : LE QUESTIONNAIRE (page index.html)
   Le calcul se trouve dans recommandation.js, et l'affichage
   des résultats dans resultats.js (page resultats.html).
   Ici, on s'occupe seulement :
   - d'afficher les questions une par une, avec un glissement entre chacune ;
   - d'adapter les tranches de poids au parcours homme ou femme ;
   - de remplir la barre de progression au fil des réponses ;
   - d'afficher le récapitulatif, pour changer une réponse sans tout refaire ;
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
const recapitulatif = document.getElementById("recapitulatif");
const listeReponses = document.getElementById("liste-reponses");

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
// "retouche" : on vient du récapitulatif pour changer une réponse.
// Après la réponse, on y retourne au lieu de passer à la question suivante.
let retouche = false;

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
  // Pendant une retouche, "Suivant" devient "Valider" et ramène au récapitulatif.
  boutonSuivant.textContent = retouche ? "Valider" : "Suivant";
  boutonSuivant.hidden = derniere && !retouche;
  boutonEnvoyer.hidden = !derniere || retouche;

  // On ne peut avancer que si la question a sa réponse.
  boutonSuivant.disabled = !estRepondue(etapes[etapeActuelle]);
  boutonEnvoyer.classList.toggle("pret", derniere && estRepondue(etapes[etapeActuelle]));
}


/* ---------- 6. Passer d'une question à l'autre ----------
   L'ancienne vue glisse et s'efface, puis la nouvelle arrive de l'autre côté.
   Le sens du glissement dépend du sens : vers l'avant ou vers l'arrière.
   Une "vue" est une question (un <fieldset>) ou le récapitulatif. */
let vueActuelle = null;

function changerVue(nouvelle, sens, avantEntree) {
  const ancienne = vueActuelle;
  vueActuelle = nouvelle;

  // 1. L'ancienne vue sort.
  ancienne.classList.remove("entree-avance", "entree-recule");
  ancienne.classList.add("sortie-" + sens);

  // 2. Une fois sortie, on la cache et on fait entrer la nouvelle.
  setTimeout(function () {
    ancienne.hidden = true;
    ancienne.classList.remove("sortie-avance", "sortie-recule");
    etapes.concat(recapitulatif).forEach(function (vue) {
      if (vue !== nouvelle) {
        vue.hidden = true;
      }
    });
    avantEntree();
    nouvelle.hidden = false;
    nouvelle.classList.add("entree-" + sens);

    // Si le haut du questionnaire est sorti de l'écran (téléphone), on y remonte.
    if (zoneQuestionnaire.getBoundingClientRect().top < 0) {
      zoneQuestionnaire.scrollIntoView({ behavior: mouvementReduit ? "auto" : "smooth" });
    }
    // Le focus va sur la nouvelle vue : un lecteur d'écran la lit tout de suite.
    nouvelle.focus({ preventScroll: true });
  }, DUREE_SORTIE);
}

function allerA(index) {
  const memeQuestion = index === etapeActuelle && vueActuelle === etapes[index];
  if (memeQuestion || index < 0 || index >= etapes.length) {
    return;
  }
  const sens = index > etapeActuelle || vueActuelle === recapitulatif ? "avance" : "recule";
  etapeActuelle = index;
  changerVue(etapes[index], sens, function () {
    navigation.hidden = false;
    progression.hidden = false;
    mettreAJourNavigation();
  });
}


/* ---------- 7. Le récapitulatif ----------
   Une ligne par question : la question, la réponse donnée, et "Modifier".
   Un clic sur la ligne ouvre la question ; une fois répondue, on revient ici. */

// Le texte de la question, sans son numéro ni ses précisions entre parenthèses :
// "2. Quel est ton niveau ?" -> "Quel est ton niveau ?"
function texteQuestion(etape) {
  return etape.querySelector("legend").textContent
    .replace(/^\d+\.\s*/, "")      // le numéro du début
    .replace(/\s*\([^)]*\)/, "")    // "(plusieurs choix possibles)"
    .replace(/\s*:$/, "")            // les deux-points de la fin
    .trim();
}

// Le texte de la réponse, tel qu'il est écrit dans la case cochée ou la liste.
function texteReponse(etape) {
  const liste = etape.querySelector("select");
  if (liste) {
    return liste.value ? liste.selectedOptions[0].textContent : "";
  }
  const cochees = Array.from(etape.querySelectorAll("input:checked"));
  const textes = cochees.map(function (champ) {
    return etape.querySelector(`label[for="${champ.id}"]`).textContent.trim();
  });
  // Les blessures : aucune case cochée est une vraie réponse.
  if (textes.length === 0 && etape.querySelector('input[type="checkbox"]')) {
    return "Aucune";
  }
  return textes.join(", ");
}

function remplirRecapitulatif() {
  listeReponses.innerHTML = etapes.map(function (etape, index) {
    return `
      <li>
        <button type="button" class="ligne-reponse" data-etape="${index}">
          <span class="ligne-question">${texteQuestion(etape)}</span>
          <span class="ligne-valeur">${texteReponse(etape)}</span>
          <span class="ligne-modifier" aria-hidden="true">Modifier</span>
        </button>
      </li>`;
  }).join("");
}

function afficherRecapitulatif() {
  retouche = true;
  changerVue(recapitulatif, "avance", function () {
    remplirRecapitulatif();
    navigation.hidden = true;
    // Le récapitulatif a son propre titre : la barre de progression se retire.
    progression.hidden = true;
  });
}

// Un clic sur une ligne ouvre la question correspondante.
listeReponses.addEventListener("click", function (evenement) {
  const ligne = evenement.target.closest(".ligne-reponse");
  if (ligne) {
    allerA(Number(ligne.dataset.etape));
  }
});


/* ---------- 8. Reprendre des réponses déjà données ----------
   En revenant des résultats par « Modifier mes réponses », les réponses sont
   dans l'adresse de la page (index.html?sexe=femme&niveau=debutant...).
   On coche les mêmes cases, puis on efface les réponses de l'adresse. */
function reprendreReponses() {
  const reponses = new URLSearchParams(window.location.search);
  if (!reponses.get("sexe")) {
    return;
  }
  // Le sexe d'abord : il choisit les tranches de poids proposées.
  preparerParcours(reponses.get("sexe"));
  reponses.forEach(function (valeur, nom) {
    formulaire.querySelectorAll(`[name="${nom}"]`).forEach(function (champ) {
      if (champ.tagName === "SELECT") {
        champ.value = valeur;
      } else if (champ.value === valeur) {
        champ.checked = true;
      }
    });
  });
  // L'adresse redevient « index.html#questionnaire », sans les réponses.
  history.replaceState(null, "", window.location.pathname + window.location.hash);
}


/* ---------- 9. Mettre le questionnaire en route ---------- */
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
  // Le récapitulatif aussi peut recevoir le focus quand il apparaît.
  recapitulatif.tabIndex = -1;

  // Si le navigateur a gardé des réponses (bouton "Retour"), on prépare le bon parcours.
  const sexeDejaCoche = document.querySelector('input[name="sexe"]:checked');
  if (sexeDejaCoche) {
    preparerParcours(sexeDejaCoche.value);
  }
  // Si on revient des résultats pour modifier, on reprend les réponses de l'adresse.
  reprendreReponses();

  etapes.forEach(function (etape) {
    etape.hidden = true;
    // tabindex="-1" : la question peut recevoir le focus quand elle apparaît.
    etape.tabIndex = -1;
  });

  // Toutes les réponses sont là : on montre le récapitulatif.
  // Sinon, on reprend à la première question sans réponse.
  const premiereSansReponse = etapes.findIndex(function (etape) {
    return !estRepondue(etape);
  });
  if (premiereSansReponse === -1) {
    retouche = true;
    remplirRecapitulatif();
    recapitulatif.hidden = false;
    vueActuelle = recapitulatif;
    navigation.hidden = true;
    // Le récapitulatif a son propre titre : la barre de progression se retire.
    progression.hidden = true;
  } else {
    etapeActuelle = premiereSansReponse;
    etapes[etapeActuelle].hidden = false;
    vueActuelle = etapes[etapeActuelle];
    mettreAJourNavigation();
  }
}


/* ---------- 10. Réagir aux réponses ----------
   Après un clic sur une réponse, on passe tout seul à la question suivante
   (ou on revient au récapitulatif, si on était venu en changer une).
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
  const peutAvancer = retouche || depuis < etapes.length - 1;
  if (avanceSeule && peutAvancer && champ.value) {
    setTimeout(function () {
      // On n'avance que si la personne n'a pas déjà changé de question entre-temps.
      if (etapeActuelle === depuis && vueActuelle === etapes[depuis]) {
        suite();
      }
    }, PAUSE_AVANT_SUITE);
  }
});

// Après une réponse : la question suivante, ou le récapitulatif pendant une retouche.
// Si un changement a vidé une autre réponse (le poids, quand on change de sexe),
// on va d'abord la redemander.
function suite() {
  if (!retouche) {
    allerA(etapeActuelle + 1);
    return;
  }
  const manquante = etapes.findIndex(function (etape) {
    return !estRepondue(etape);
  });
  if (manquante === -1) {
    afficherRecapitulatif();
  } else {
    allerA(manquante);
  }
}

boutonSuivant.addEventListener("click", suite);

boutonPrecedent.addEventListener("click", function () {
  allerA(etapeActuelle - 1);
});


/* ---------- 11. Envoyer les réponses ----------
   On part vers resultats.html en emportant les réponses dans l'adresse de la page.
   Exemple : resultats.html?sexe=femme&niveau=debutant&km=15a30...
   URLSearchParams fabrique cette fin d'adresse à partir du formulaire. */
formulaire.addEventListener("submit", function (evenement) {
  evenement.preventDefault();

  // La touche Entrée sur une question (pas la dernière) passe simplement à la suivante.
  const surQuestion = vueActuelle !== recapitulatif;
  if (surQuestion && (retouche || etapeActuelle < etapes.length - 1)) {
    if (estRepondue(etapes[etapeActuelle])) {
      suite();
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


/* ---------- 12. Démarrage ---------- */
demarrer();
