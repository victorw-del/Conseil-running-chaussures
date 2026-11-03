/* =========================================================
   EFFETS.JS : LES EFFETS COMMUNS AUX PAGES
   Chargé par toutes les pages. Il s'occupe :
   - de faire apparaître en douceur les blocs quand on descend dans la page ;
   - du fondu quand on change de page (si le navigateur ne le fait pas déjà) ;
   - de la lueur dorée qui suit la souris sur le bandeau d'accueil.
   Rien de tout ça ne se fait si l'appareil demande moins d'animations.
   ========================================================= */

const mouvementReduitEffets = window.matchMedia("(prefers-reduced-motion: reduce)").matches;


/* ---------- 1. Les apparitions au défilement ----------
   Les blocs listés ici démarrent invisibles (classe "revele" dans le CSS).
   IntersectionObserver prévient quand un bloc entre dans l'écran :
   on lui ajoute alors la classe "visible", qui le fait apparaître. */
function revelerAuDefilement(elements) {
  if (mouvementReduitEffets || !("IntersectionObserver" in window)) {
    return;
  }
  const observateur = new IntersectionObserver(function (entrees) {
    entrees.forEach(function (entree) {
      if (entree.isIntersecting) {
        entree.target.classList.add("visible");
        observateur.unobserve(entree.target);   // une seule fois suffit
      }
    });
  }, { rootMargin: "0px 0px -8% 0px" });

  elements.forEach(function (element) {
    element.classList.add("revele");
    observateur.observe(element);
  });
}

// resultats.js s'en sert aussi pour ses cartes, d'où window.
window.revelerAuDefilement = revelerAuDefilement;

revelerAuDefilement(document.querySelectorAll(
  "#questionnaire > h2, #avertissement, #guide, .bloc-texte, footer"
));


/* ---------- 2. Le fondu entre les pages ----------
   Les navigateurs récents font eux-mêmes un fondu entre deux pages du site
   (« View Transitions », réglé dans le CSS). Pour les autres, on fait un petit
   fondu de sortie à la main : la page s'efface, puis on change d'adresse. */
const transitionsNatives = "PageRevealEvent" in window;

function partirVers(adresse) {
  if (transitionsNatives || mouvementReduitEffets) {
    window.location.href = adresse;
    return;
  }
  document.body.classList.add("depart");
  setTimeout(function () {
    window.location.href = adresse;
  }, 280);
}

window.partirVers = partirVers;

// Les liens vers les autres pages du site profitent aussi du fondu.
document.addEventListener("click", function (evenement) {
  const lien = evenement.target.closest("a[href]");
  if (!lien || transitionsNatives || mouvementReduitEffets) {
    return;
  }
  // On laisse faire le navigateur pour : nouvel onglet, touches Ctrl/Cmd/Maj,
  // liens vers un autre site, et liens vers un endroit de la même page (#...).
  const autreOnglet = lien.target === "_blank" || evenement.ctrlKey || evenement.metaKey || evenement.shiftKey;
  const url = new URL(lien.href, window.location.href);
  const memePage = url.pathname === window.location.pathname && url.hash;
  if (autreOnglet || url.origin !== window.location.origin || memePage) {
    return;
  }
  evenement.preventDefault();
  partirVers(url.href);
});

// Avec le bouton "Retour", le navigateur peut réafficher la page telle qu'on l'a quittée :
// on enlève alors le fondu de sortie pour qu'elle ne reste pas effacée.
window.addEventListener("pageshow", function () {
  document.body.classList.remove("depart");
});


/* ---------- 3. La lueur qui suit la souris sur l'accueil ----------
   On donne au CSS la position de la souris (--x et --y, en pourcentage) ;
   il y dessine une lumière dorée très douce. Seulement avec une souris. */
const accueil = document.querySelector(".hero .accueil");
if (accueil && !mouvementReduitEffets && window.matchMedia("(hover: hover)").matches) {
  accueil.addEventListener("pointermove", function (evenement) {
    const cadre = accueil.getBoundingClientRect();
    accueil.style.setProperty("--x", `${((evenement.clientX - cadre.left) / cadre.width) * 100}%`);
    accueil.style.setProperty("--y", `${((evenement.clientY - cadre.top) / cadre.height) * 100}%`);
  });
}
