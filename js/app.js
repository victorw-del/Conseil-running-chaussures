/* =========================================================
   APP.JS : LE QUESTIONNAIRE (page index.html)
   Le calcul se trouve dans recommandation.js, et l'affichage
   des résultats dans resultats.js (page resultats.html).
   Ici, on s'occupe seulement :
   - d'afficher la suite du questionnaire une fois le sexe choisi ;
   - d'adapter les tranches de poids au parcours homme ou femme ;
   - d'envoyer les réponses vers la page des résultats.
   ========================================================= */


/* ---------- 1. Les éléments de la page dont on a besoin ---------- */
const formulaire = document.getElementById("formulaire");
const suiteQuestions = document.getElementById("suite-questions");
const listePoids = document.getElementById("poids");
const boutonsSexe = document.querySelectorAll('input[name="sexe"]');


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
  // On remplit la liste déroulante du poids avec les tranches du bon parcours.
  // La première option, vide, oblige toujours à faire un vrai choix ("required").
  const options = tranchesDePoids[sexe].map(function (tranche) {
    return `<option value="${tranche.valeur}">${tranche.texte}</option>`;
  }).join("");
  listePoids.innerHTML = `<option value="">Choisis une réponse</option>` + options;

  // On affiche la suite des questions. L'attribut "hidden" les cachait jusqu'ici.
  suiteQuestions.hidden = false;
}

// À chaque clic sur "Homme" ou "Femme", on prépare le parcours correspondant.
boutonsSexe.forEach(function (bouton) {
  bouton.addEventListener("change", function () {
    preparerParcours(bouton.value);
  });
});

// Si le navigateur a gardé les réponses (bouton "Retour"), on réaffiche tout de suite la suite.
const sexeDejaCoche = document.querySelector('input[name="sexe"]:checked');
if (sexeDejaCoche) {
  preparerParcours(sexeDejaCoche.value);
}


/* ---------- 4. Réagir au clic sur "Voir mes chaussures" ----------
   Au lieu d'afficher les résultats ici, on part vers resultats.html en emportant
   les réponses dans l'adresse de la page. Exemple :
   resultats.html?sexe=femme&niveau=debutant&km=15a30...
   URLSearchParams fabrique cette fin d'adresse à partir du formulaire. */
formulaire.addEventListener("submit", function (evenement) {
  evenement.preventDefault();

  const reponses = new URLSearchParams(new FormData(formulaire));
  window.location.href = "resultats.html?" + reponses.toString();
});
