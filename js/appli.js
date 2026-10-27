/* =========================================================
   APPLI.JS : TRANSFORMER LE SITE EN APPLI DE TÉLÉPHONE
   Chargé par les deux pages. Il installe le "service worker" (sw.js),
   qui garde une copie du site pour qu'il s'ouvre même sans connexion.
   ========================================================= */

// Tous les navigateurs ne connaissent pas les service workers : on vérifie d'abord.
if ("serviceWorker" in navigator) {
  // On attend que la page soit chargée pour ne pas la ralentir.
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js");
  });
}
