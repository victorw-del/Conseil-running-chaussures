/* =========================================================
   APP.JS : LA LOGIQUE DU SITE
   Partie 1 : charger les chaussures et lire les réponses
   ========================================================= */


/* ---------- 1. Les éléments de la page dont on a besoin ----------
   document.getElementById("...") va chercher dans la page l'élément qui a cet id.
   On le range dans une variable pour pouvoir l'utiliser ensuite. */
const formulaire = document.getElementById("formulaire");
const zoneResultats = document.getElementById("resultats");


/* ---------- 2. La liste des chaussures ----------
   Au départ, c'est une liste vide [ ]. Elle sera remplie quand le fichier JSON sera chargé.
   On utilise "let" (et pas "const") parce qu'on va la remplacer par la vraie liste. */
let chaussures = [];


/* ---------- 3. Charger le fichier data/chaussures.json ----------
   "async" indique que cette fonction contient des étapes qui prennent du temps
   (télécharger un fichier), et qu'on y utilisera "await". */
async function chargerChaussures() {
  // "try" veut dire : essaie ce bloc. Si une erreur arrive, on saute directement au bloc "catch".
  try {
    // fetch() demande le fichier au serveur. await : on attend la réponse.
    const reponse = await fetch("data/chaussures.json");

    // reponse.ok vaut true si le fichier a bien été trouvé.
    // Sinon (par exemple erreur 404 "fichier introuvable"), on déclenche nous-mêmes une erreur.
    if (!reponse.ok) {
      throw new Error("Fichier introuvable (code " + reponse.status + ")");
    }

    // On transforme le texte JSON en vraie liste JavaScript.
    const toutesLesChaussures = await reponse.json();

    // On ne garde que les chaussures vérifiées... ou les exemples (pendant le développement).
    // filter() parcourt la liste et ne garde que les éléments pour lesquels la fonction répond true.
    // || veut dire "OU".
    chaussures = toutesLesChaussures.filter(function (chaussure) {
      return chaussure.verifie === true || chaussure.exemple === true;
    });

    // Message de contrôle dans la console. .length donne le nombre d'éléments d'une liste.
    console.log(chaussures.length + " chaussures chargées :", chaussures);

  } catch (erreur) {
    // Si quelque chose a raté, on l'écrit dans la console (en rouge)...
    console.error("Impossible de charger les chaussures :", erreur);
    // ... et on prévient aussi le visiteur dans la page.
    zoneResultats.innerHTML = "<h2>Oups</h2><p>Les chaussures n'ont pas pu être chargées. Réessaie dans un instant.</p>";
  }
}


/* ---------- 4. Lire les réponses du questionnaire ----------
   Cette fonction renvoie un objet avec toutes les réponses, par exemple :
   { niveau: "debutant", km: "15a30", terrain: "route", blessures: ["genou"], ... } */
function lireReponses() {
  // FormData lit d'un coup toutes les réponses du formulaire.
  const donnees = new FormData(formulaire);

  // donnees.get("nom") renvoie la "value" choisie pour la question qui a ce "name".
  // Pour les blessures (des checkbox, plusieurs réponses possibles), on utilise getAll(),
  // qui renvoie une LISTE (vide si rien n'est coché).
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


/* ---------- 5. Réagir au clic sur "Voir mes chaussures" ----------
   addEventListener("submit", ...) : "quand le formulaire est envoyé, exécute cette fonction".
   Le navigateur nous donne un objet "evenement" qui décrit ce qui vient de se passer. */
formulaire.addEventListener("submit", function (evenement) {
  // Par défaut, envoyer un formulaire RECHARGE la page (tu l'as vu à l'étape 4).
  // preventDefault() annule ce comportement : on garde la main, sans rechargement.
  evenement.preventDefault();

  const reponses = lireReponses();
  console.log("Réponses du coureur :", reponses);

  // À l'étape 8, c'est ici qu'on calculera le score de chaque chaussure.
});


/* ---------- 6. Démarrage ----------
   On lance le chargement des chaussures dès l'ouverture de la page. */
chargerChaussures();