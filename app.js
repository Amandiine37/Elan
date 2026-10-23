/* ==================================================================
   Élan — logique de l'application.
   Tout est enregistré dans le localStorage du téléphone (clé K) :
   rien ne part sur internet. Le bouton « Sauvegarder » sort un fichier.
   ================================================================== */
(function(){
  "use strict";

  var VERSION = "1.1";
  var K = "elan_donnees_v1";
  var K_SAUVEGARDE = "elan_sauvegarde_v1";
  var K_VUE = "elan_vue_v1";

  var $ = function(s, r){ return (r || document).querySelector(s); };
  var $$ = function(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s){
    return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function cloner(o){ return JSON.parse(JSON.stringify(o)); }
  function pluriel(n, mot, motPluriel){ return n + " " + (n > 1 ? (motPluriel || mot + "s") : mot); }
  function borner(v, min, max){ return Math.max(min, Math.min(max, v)); }

  /* ---------------- Stockage ---------------- */
  var stockageOk = true;
  function lire(k, def){
    try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : def; }
    catch(e){ return def; }
  }
  function ecrire(k, v){
    try { localStorage.setItem(k, JSON.stringify(v)); return true; }
    catch(e){ stockageOk = false; return false; }
  }
  try { localStorage.setItem("elan_test", "1"); localStorage.removeItem("elan_test"); }
  catch(e){ stockageOk = false; }

  /* ---------------- Dates (toujours en heure locale) ---------------- */
  var JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
  var JOURS_C = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];
  var MOIS_C = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  function deux(n){ return (n < 10 ? "0" : "") + n; }
  function iso(d){ return d.getFullYear() + "-" + deux(d.getMonth() + 1) + "-" + deux(d.getDate()); }
  function depuisIso(s){ var p = s.split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function ajouterJours(d, n){ var r = new Date(d.getFullYear(), d.getMonth(), d.getDate()); r.setDate(r.getDate() + n); return r; }
  function lundiDe(d){ return ajouterJours(d, -((d.getDay() + 6) % 7)); }
  function cleSemaine(d){ return iso(lundiDe(d)); }
  function decalerSemaine(wk, n){ return iso(ajouterJours(depuisIso(wk), 7 * n)); }
  function dateDuJour(wk, j){ return iso(ajouterJours(depuisIso(wk), j)); }
  function aujourdhui(){ return iso(new Date()); }
  function semaineCourante(){ return cleSemaine(new Date()); }
  function ecartSemaines(a, b){ return Math.round((depuisIso(b) - depuisIso(a)) / (7 * 864e5)); }
  function joursDepuis(isoD){ return Math.floor((depuisIso(aujourdhui()) - depuisIso(isoD)) / 864e5); }
  function dateCourte(isoD){ var d = depuisIso(isoD); return d.getDate() + " " + MOIS_C[d.getMonth()]; }
  function libSemaine(wk){
    var a = depuisIso(wk), b = ajouterJours(a, 6);
    if(a.getMonth() === b.getMonth()) return "du " + a.getDate() + " au " + b.getDate() + " " + MOIS_C[b.getMonth()];
    return "du " + a.getDate() + " " + MOIS_C[a.getMonth()] + " au " + b.getDate() + " " + MOIS_C[b.getMonth()];
  }
  function indexJour(isoD){ return (depuisIso(isoD).getDay() + 6) % 7; }

  /* ---------------- Données ---------------- */
  function dispenseVide(){ return { zones: [], sansSaut: false, exos: [], jusquau: "", note: "" }; }
  function donneesVides(){
    return {
      reglages: { prenom: "", objectifDefaut: 2, mode: "auto", theme: "energie", rappelJours: 14, debut: semaineCourante(), dispense: dispenseVide() },
      semaineType: [],      // séances prévues qui se répètent chaque semaine
      semaines: {},         // planning propre à une semaine : { "2026-10-19": [séances] }
      faits: [],            // séances réalisées
      programmes: [],
      jokers: [],           // semaines « off » protégées par un joker
      debloques: {},        // récompenses obtenues : { id: date }
      vus: {},              // récompenses déjà regardées (pour la pastille « nouveau »)
      jokersAnnonces: 0,
      gen: null             // derniers choix du générateur
    };
  }
  function normaliser(d){
    var base = donneesVides();
    if(!d || typeof d !== "object") return base;
    Object.keys(base).forEach(function(k){ if(d[k] !== undefined) base[k] = d[k]; });
    base.reglages = Object.assign(donneesVides().reglages, d.reglages || {});
    base.reglages.dispense = Object.assign(dispenseVide(), base.reglages.dispense || {});
    return base;
  }
  var D = normaliser(lire(K, null));
  function sauver(){ ecrire(K, D); }

  /* Les semaines passées sans planning propre reçoivent une copie de la
     semaine type : modifier la semaine type plus tard ne change donc pas
     l'objectif des semaines déjà écoulées. */
  function figerSemainesPassees(){
    var cur = semaineCourante(), wk = D.reglages.debut, n = 0, change = false;
    while(wk < cur && n < 800){
      if(!D.semaines[wk]){ D.semaines[wk] = cloner(D.semaineType); change = true; }
      wk = decalerSemaine(wk, 1); n++;
    }
    if(change) sauver();
  }

  function planDe(wk){ return D.semaines[wk] || D.semaineType; }
  function planModifiable(wk){
    if(!D.semaines[wk]) D.semaines[wk] = cloner(D.semaineType);
    return D.semaines[wk];
  }
  function faitsDe(wk){ return D.faits.filter(function(f){ return f.sem === wk; }); }
  function faitDuCreneau(wk, id){ return D.faits.find(function(f){ return f.sem === wk && f.slot === id; }); }
  function objectifDe(wk){ return planDe(wk).length || Math.max(1, Number(D.reglages.objectifDefaut) || 1); }
  function trierCreneaux(l){ return l.slice().sort(function(a, b){ return a.j - b.j; }); }
  function act(k){ return ACTIVITES[k] || ACTIVITES.autre; }
  function titreDe(s){ return s.titre || act(s.activite).nom; }
  function progDe(id){ return D.programmes.find(function(p){ return p.id === id; }); }

  /* ---------------- Dispense / contre-indications ----------------
     La dispense (zones à ménager, pas de saut, exercices exclus) est
     enregistrée dans les réglages. Elle filtre le générateur et les idées
     de programmes, et signale ⚠️ les exercices à éviter partout ailleurs. */
  var EXO_PAR_NOM = {};
  EXERCICES.forEach(function(e){ EXO_PAR_NOM[e.n] = e; });
  ECHAUFFEMENT.forEach(function(x){ EXO_PAR_NOM[x.n] = { n: x.n, t: x.t, imp: x.imp, echauf: 1 }; });
  function dispense(){ return D.reglages.dispense; }
  function dispenseActive(){ var d = dispense(); return d.zones.length > 0 || d.sansSaut || d.exos.length > 0; }
  function raisonEviter(nom, zones, sansSaut, interdits){
    if(interdits && interdits.indexOf(nom) >= 0) return "exclu par toi";
    var e = EXO_PAR_NOM[nom];
    for(var i = 0; i < zones.length; i++){
      var Z = ZONES_SENSIBLES[zones[i]];
      if(!Z) continue;
      if(Z.exos.indexOf(nom) >= 0 || (e && Z.sansSaut && e.imp) || (e && Z.flag && e[Z.flag])) return Z.nom.toLowerCase();
    }
    if(sansSaut && e && e.imp) return "pas de saut";
    return null;
  }
  function raisonDispense(nom){ var d = dispense(); return raisonEviter(nom, d.zones, d.sansSaut, d.exos); }
  function libDispense(){
    var d = dispense(), l = d.zones.map(function(z){ return ZONES_SENSIBLES[z].nom.toLowerCase(); });
    if(d.sansSaut) l.push("pas de saut");
    if(d.exos.length) l.push(pluriel(d.exos.length, "exercice exclu", "exercices exclus"));
    return l.join(", ");
  }
  function conflits(p){
    var n = 0;
    (p.seances || []).forEach(function(s){ (s.exos || []).forEach(function(x){ if(raisonDispense(x.nom)) n++; }); });
    return n;
  }
  function seanceEnConflit(slot){
    var p = slot.prog ? progDe(slot.prog) : null, se = p && p.seances[slot.seance];
    return !!(se && se.exos.some(function(x){ return raisonDispense(x.nom); }));
  }

  /* État d'une semaine : complete, joker, encours (semaine actuelle pas
     encore complète), neutre (1re semaine d'utilisation pas complète :
     elle ne casse pas la série), incomplete. */
  function etatSemaine(wk){
    var cur = semaineCourante();
    if(wk > cur) return "avenir";
    if(D.jokers.indexOf(wk) >= 0) return "joker";
    if(faitsDe(wk).length >= objectifDe(wk)) return "complete";
    if(wk === cur) return "encours";
    if(wk === D.reglages.debut) return "neutre";
    return "incomplete";
  }

  function calculerStats(){
    var cur = semaineCourante(), wk = D.reglages.debut, n = 0;
    var run = 0, best = 0, completes = 0, phenix = 0, casse = false, weekend = 0, parfaite = 0;
    var etats = {};
    while(wk <= cur && n < 800){
      var e = etatSemaine(wk); etats[wk] = e;
      if(e === "complete"){
        run++; completes++;
        if(casse && run >= 2) phenix = 1;
      } else if(e === "incomplete"){
        if(run >= 2) casse = true;
        run = 0;
      }
      best = Math.max(best, run);
      var fs = faitsDe(wk);
      var jours = fs.map(function(f){ return indexJour(f.date); });
      if(jours.indexOf(5) >= 0 && jours.indexOf(6) >= 0) weekend = 1;
      var plan = planDe(wk);
      if(plan.length >= 2 && plan.every(function(s){
        var f = faitDuCreneau(wk, s.id); return f && f.date === dateDuJour(wk, s.j);
      })) parfaite = 1;
      wk = decalerSemaine(wk, 1); n++;
    }
    var minutes = D.faits.reduce(function(t, f){ return t + (Number(f.duree) || 0); }, 0);
    var types = {};
    D.faits.forEach(function(f){ types[f.activite] = 1; });
    var gagnes = Math.floor(completes / JOKER_TOUTES);
    return {
      serie: best, actuelle: run, seances: D.faits.length, minutes: minutes, heures: minutes / 60,
      completes: completes, weekend: weekend, parfaite: parfaite, types: Object.keys(types).length,
      phenix: phenix,
      architecte: D.programmes.some(function(p){ return p.origine !== "modele"; }) ? 1 : 0,
      sauvegarde: lire(K_SAUVEGARDE, {}).le ? 1 : 0,
      etats: etats, jokersGagnes: gagnes, jokersDispo: Math.max(0, gagnes - D.jokers.length)
    };
  }

  /* ---------------- Récompenses ---------------- */
  function infoRecompense(r){
    if(r.type === "recette"){ var x = RECETTES[r.id]; return { e: x.e, titre: x.titre, lib: "Recette" }; }
    if(r.type === "exercice"){ var b = BONUS[r.id]; return { e: b.e, titre: b.titre, lib: "Exercice bonus" }; }
    if(r.type === "theme"){ var t = THEMES[r.theme]; return { e: t.e, titre: "Thème " + t.nom, lib: "Thème" }; }
    return { e: r.e, titre: r.titre, lib: "Badge" };
  }
  function libCondition(c){
    if(c.k === "serie") return pluriel(c.v, "semaine complète", "semaines complètes") + " d'affilée";
    if(c.k === "seances") return pluriel(c.v, "séance") + " au total";
    if(c.k === "heures") return c.v + " h de sport au total";
    if(c.k === "types") return c.v + " activités différentes";
    if(c.k === "weekend") return "Une séance samedi ET dimanche";
    if(c.k === "parfaite") return "Une semaine parfaite";
    if(c.k === "phenix") return "Revenir après une série cassée";
    if(c.k === "architecte") return "Créer un programme";
    if(c.k === "sauvegarde") return "Faire une sauvegarde";
    return "";
  }
  function themeDebloque(cle){ return cle === "energie" || !!D.debloques["t-" + cle]; }

  function verifierRecompenses(annoncer){
    var st = calculerStats(), nouveaux = [];
    RECOMPENSES.forEach(function(r){
      if(!D.debloques[r.id] && (st[r.cond.k] || 0) >= r.cond.v){
        D.debloques[r.id] = aujourdhui();
        nouveaux.push(infoRecompense(r));
      }
    });
    var jokersNeufs = st.jokersGagnes - (D.jokersAnnonces || 0);
    if(jokersNeufs > 0){
      D.jokersAnnonces = st.jokersGagnes;
      nouveaux.push({ e: "🃏", titre: jokersNeufs > 1 ? jokersNeufs + " jokers gagnés" : "Un joker gagné", lib: "Joker" });
    }
    if(nouveaux.length){
      sauver();
      if(annoncer !== false) feter(nouveaux);
    }
    majPointRecompenses();
  }
  function majPointRecompenses(){
    var neuf = Object.keys(D.debloques).some(function(id){ return !D.vus[id]; });
    $("#point-recompenses").hidden = !neuf;
  }

  /* ---------------- Thèmes ---------------- */
  var mqSombre = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  function appliquerTheme(){
    if(!themeDebloque(D.reglages.theme)) D.reglages.theme = "energie";
    var t = THEMES[D.reglages.theme] || THEMES.energie;
    var sombre = D.reglages.mode === "sombre" || (D.reglages.mode === "auto" && mqSombre && mqSombre.matches);
    document.documentElement.setAttribute("data-theme", sombre ? "dark" : "light");
    var p = sombre ? t.dark : t.light, st = document.documentElement.style;
    Object.keys(p).forEach(function(k){ st.setProperty("--" + k, p[k]); });
    st.setProperty("--shadow", sombre ? "0 1px 2px rgba(0,0,0,.35), 0 8px 22px rgba(0,0,0,.4)"
      : "0 1px 2px rgba(0,0,0,.05), 0 6px 18px rgba(0,0,0,.07)");
    var meta = $('meta[name="theme-color"]');
    if(meta) meta.setAttribute("content", p.accent);
  }
  if(mqSombre){
    var auChangement = function(){ if(D.reglages.mode === "auto") appliquerTheme(); };
    if(mqSombre.addEventListener) mqSombre.addEventListener("change", auChangement);
    else if(mqSombre.addListener) mqSombre.addListener(auChangement);
  }

  /* ---------------- Feuille (fenêtre du bas), toasts, fête ---------------- */
  /* Une entrée d'historique par fenêtre ouverte : le bouton « retour » du
     téléphone ferme la fenêtre au lieu de quitter l'appli. Fermer avec ✕
     laisse l'entrée en place, elle resservira à la fenêtre suivante. */
  var feuilleOuverte = false, entreeHistorique = false;
  function ouvrirFeuille(titre, html, apres){
    $("#feuille").innerHTML = '<div class="feuille-tete"><h2>' + esc(titre) + '</h2>'
      + '<button type="button" class="fermer" data-a="fermer" aria-label="Fermer">✕</button></div>' + html;
    $("#voile").hidden = false;
    document.body.style.overflow = "hidden";
    $("#feuille").scrollTop = 0;
    feuilleOuverte = true;
    if(!entreeHistorique){
      try { history.pushState({ feuille: 1 }, ""); entreeHistorique = true; } catch(e){}
    }
    if(apres) apres($("#feuille"));
  }
  function fermerFeuille(){ if(feuilleOuverte) cacherFeuille(); }
  function cacherFeuille(){
    feuilleOuverte = false;
    $("#voile").hidden = true;
    $("#feuille").innerHTML = "";
    document.body.style.overflow = "";
    if(fetesEnAttente.length) setTimeout(montrerFete, 300);
  }
  window.addEventListener("popstate", function(){ entreeHistorique = false; if(feuilleOuverte) cacherFeuille(); });
  $("#voile").addEventListener("click", function(e){ if(e.target === this) fermerFeuille(); });

  var minuteurToast = null;
  function toast(html, boutons, duree){
    var ancien = $(".toast"); if(ancien) ancien.remove();
    clearTimeout(minuteurToast);
    var el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = "<span>" + html + "</span>";
    (boutons || []).forEach(function(b){
      var bt = document.createElement("button");
      bt.type = "button"; bt.innerHTML = b.lib;
      bt.addEventListener("click", function(){ el.remove(); b.fn(); });
      el.appendChild(bt);
    });
    document.body.appendChild(el);
    minuteurToast = setTimeout(function(){ el.remove(); }, duree || 3200);
  }

  function confettis(){
    var c = $("#confettis");
    if(!c.getContext) return;
    c.hidden = false;
    c.width = window.innerWidth; c.height = window.innerHeight;
    var ctx = c.getContext("2d"), cs = getComputedStyle(document.documentElement);
    var couleurs = ["--accent", "--or", "--ok", "--accentStrong"].map(function(v){ return cs.getPropertyValue(v).trim() || "#F2542D"; });
    var parts = [];
    for(var i = 0; i < 140; i++){
      parts.push({ x: c.width / 2 + (Math.random() - .5) * 80, y: c.height * .35, vx: (Math.random() - .5) * 13,
        vy: -Math.random() * 13 - 4, r: Math.random() * 6 + 4, a: Math.random() * 6, va: (Math.random() - .5) * .3,
        col: couleurs[i % couleurs.length] });
    }
    var debut = performance.now();
    (function image(t){
      var ecoule = t - debut;
      ctx.clearRect(0, 0, c.width, c.height);
      parts.forEach(function(p){
        p.vy += .38; p.x += p.vx; p.y += p.vy; p.a += p.va; p.vx *= .99;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
        ctx.globalAlpha = Math.max(0, 1 - ecoule / 2200);
        ctx.fillStyle = p.col; ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore();
      });
      if(ecoule < 2200) requestAnimationFrame(image);
      else { ctx.clearRect(0, 0, c.width, c.height); c.hidden = true; }
    })(debut);
  }

  /* La fête attend qu'aucune fenêtre ne soit ouverte : elle ne doit jamais
     remplacer ce que la personne est en train de faire. */
  var fetesEnAttente = [];
  function feter(items){
    fetesEnAttente = fetesEnAttente.concat(items);
    setTimeout(montrerFete, 350);
  }
  function montrerFete(){
    if(feuilleOuverte || !fetesEnAttente.length) return;
    var items = fetesEnAttente;
    fetesEnAttente = [];
    var html = '<div class="fete"><div class="gros-e">🎉</div><p><b>Tu viens de débloquer :</b></p></div><div class="card fete-liste">'
      + items.map(function(i){
        return '<div class="palier"><span class="e">' + i.e + '</span><div class="c"><b>' + esc(i.titre) + '</b><small>' + esc(i.lib) + '</small></div></div>';
      }).join("") + '</div>'
      + '<div class="rangee-btn"><button type="button" class="btn principal" data-a="voir-recompenses">Voir mes récompenses</button>'
      + '<button type="button" class="btn" data-a="fermer">Super !</button></div>';
    ouvrirFeuille("Bravo !", html);
    confettis();
  }

  /* ================================================================
     Vues
     ================================================================ */
  var vue = lire(K_VUE, "semaine");
  var semaineVue = semaineCourante();
  var planVue = semaineCourante();
  var planMode = "semaine";
  var ongletTresor = "badge";
  var RESSENTIS = { 1: "😮‍💨 Dur", 2: "🙂 Bien", 3: "💪 Au top" };

  var SVG_COCHE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  function afficherVue(v){
    vue = v; ecrire(K_VUE, v);
    $$(".tab").forEach(function(t){ t.classList.toggle("active", t.dataset.view === v); });
    $$(".view").forEach(function(s){ s.classList.toggle("active", s.id === "view-" + v); });
    window.scrollTo(0, 0);
    toutAfficher();
  }

  function toutAfficher(){
    var st = calculerStats();
    $("#serie-haut").textContent = st.actuelle;
    $("#sous-titre").textContent = D.reglages.prenom ? "Salut " + D.reglages.prenom + " !" : "Mon carnet sport";
    if(vue === "semaine") afficherSemaine(st);
    else if(vue === "planning") afficherPlanning();
    else if(vue === "programmes") afficherProgrammes();
    else afficherRecompenses(st);
    afficherRappel();
    majPointRecompenses();
  }

  function navSemaine(wk, action, min, max){
    var cur = semaineCourante();
    var quand = wk === cur ? "Cette semaine" : (wk > cur ? "À venir" : "Semaine passée");
    return '<div class="nav-semaine">'
      + '<button type="button" class="fleche" data-a="' + action + '" data-d="-1" ' + (wk <= min ? "disabled" : "") + ' aria-label="Semaine précédente">‹</button>'
      + '<div class="lib">' + quand + '<small>' + libSemaine(wk) + (wk !== cur ? ' · <a href="#" data-a="' + action + '" data-d="0">revenir à aujourd\'hui</a>' : "") + '</small></div>'
      + '<button type="button" class="fleche" data-a="' + action + '" data-d="1" ' + (wk >= max ? "disabled" : "") + ' aria-label="Semaine suivante">›</button>'
      + '</div>';
  }

  /* ---------------- Ma semaine (cocher) ---------------- */
  function afficherSemaine(st){
    var wk = semaineVue, cur = semaineCourante(), auj = aujourdhui();
    var plan = trierCreneaux(planDe(wk)), faits = faitsDe(wk);
    var fait = faits.length, obj = objectifDe(wk), etat = etatSemaine(wk);
    var minutes = faits.reduce(function(t, f){ return t + (Number(f.duree) || 0); }, 0);
    var pct = Math.min(1, fait / obj), C = 2 * Math.PI * 34;
    var futur = wk > cur;

    var h = navSemaine(wk, "sem-nav", D.reglages.debut, decalerSemaine(cur, 8));
    var dsp = dispense();
    if(dispenseActive() && dsp.jusquau && dsp.jusquau < auj){
      h += '<div class="bandeau">🩹 Ta dispense (' + esc(libDispense()) + ') devait se terminer le ' + dateCourte(dsp.jusquau) + ' : c\'est bon ?'
        + '<div class="actions"><button type="button" class="btn principal" data-a="retirer-dispense">Oui, la retirer</button>'
        + '<button type="button" class="btn" data-a="ouvrir-dispense">La modifier</button></div></div>';
    } else if(dispenseActive() && wk === cur){
      h += '<p class="petit muted" style="margin:-.3rem 0 .6rem">🩹 Dispense en cours : ' + esc(libDispense()) + (dsp.jusquau ? " (jusqu'au " + dateCourte(dsp.jusquau) + ")" : "")
        + ' · <a href="#" data-a="ouvrir-dispense">modifier</a></p>';
    }

    var texte;
    if(etat === "complete") texte = "<b>Semaine complète ! 🎉</b><br><span class='muted petit'>Chaque séance en plus est un bonus.</span>";
    else if(etat === "joker") texte = "<b>Semaine off 🃏</b><br><span class='muted petit'>Un joker protège ta série cette semaine.</span>";
    else if(futur) texte = "<b>" + pluriel(obj, "séance prévue", "séances prévues") + "</b>";
    else texte = "<b>" + fait + " séance" + (fait > 1 ? "s" : "") + " sur " + obj + "</b><br><span class='muted petit'>Encore "
      + pluriel(obj - fait, "séance") + " pour compléter la semaine.</span>";
    var jourAn = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 864e5);
    h += '<div class="card"><div class="resume">'
      + '<div class="anneau"><svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="34" fill="none" stroke="var(--surface2)" stroke-width="9"/>'
      + '<circle cx="40" cy="40" r="34" fill="none" stroke="' + (etat === "joker" ? "var(--or)" : "var(--ok)") + '" stroke-width="9" stroke-linecap="round" opacity="' + (pct > 0 || etat === "joker" ? 1 : 0) + '" stroke-dasharray="' + (C * (etat === "joker" ? 1 : pct)).toFixed(1) + ' ' + C.toFixed(1) + '"/></svg>'
      + '<div class="val">' + fait + '<small>sur ' + obj + '</small></div></div>'
      + '<div class="txt">' + texte
      + (minutes ? '<div class="petit muted" style="margin-top:.25rem">⏱️ ' + minutes + ' min de sport</div>' : "")
      + (!plan.length ? '<div class="petit muted" style="margin-top:.25rem">Rien de planifié : objectif par défaut de ' + pluriel(obj, "séance") + '.</div>' : "")
      + '</div></div>'
      + (wk === cur ? '<div class="phrase">« ' + esc(PHRASES[jourAn % PHRASES.length]) + ' »</div>' : "")
      + '</div>';

    if(!D.semaineType.length && !D.programmes.length && !D.faits.length && !Object.keys(D.semaines).some(function(k){ return D.semaines[k].length; })){
      h += '<div class="card"><b>Bienvenue dans Élan 👋</b><p class="petit muted">Pour commencer, crée ton programme ou planifie simplement ta semaine. '
        + 'Ensuite, il ne reste qu\'à cocher tes séances ici. Tout reste sur ce téléphone.</p>'
        + '<div class="rangee-btn"><button type="button" class="btn principal" data-a="generateur">✨ Créer mon programme</button>'
        + '<button type="button" class="btn" data-a="aller-planning-type">📅 Planifier</button></div></div>';
    }

    // Faits « en plus » (hors planning) rangés par jour.
    var idsPlan = {};
    plan.forEach(function(s){ idsPlan[s.id] = 1; });
    var extras = faits.filter(function(f){ return !f.slot || !idsPlan[f.slot]; });

    for(var j = 0; j < 7; j++){
      var date = dateDuJour(wk, j);
      var duJour = plan.filter(function(s){ return s.j === j; });
      var exJour = extras.filter(function(f){ return indexJour(f.date) === j; });
      h += '<div class="jour' + (date === auj ? " aujourdhui" : "") + '"><div class="jour-tete"><span class="nom">' + JOURS[j] + '</span>'
        + '<span class="date">' + dateCourte(date) + '</span>' + (date === auj ? '<span class="tag">Aujourd\'hui</span>' : "") + '</div>';
      duJour.forEach(function(s){
        var f = faitDuCreneau(wk, s.id), p = s.prog ? progDe(s.prog) : null;
        h += '<div class="seance' + (f ? " faite" : "") + '">'
          + '<button type="button" class="coche' + (f ? " fait" : "") + '" data-a="cocher" data-id="' + s.id + '" ' + (futur ? "disabled" : "") + ' aria-label="' + (f ? "Décocher" : "Cocher") + ' la séance">' + SVG_COCHE + '</button>'
          + '<span class="emo">' + act(s.activite).e + '</span>'
          + '<div class="corps" data-a="detail-creneau" data-id="' + s.id + '"><div class="t">' + esc(titreDe(s)) + '</div>'
          + '<div class="s">' + (s.duree ? s.duree + " min" : "") + (p ? " · " + esc(p.nom) : "") + (seanceEnConflit(s) ? " · ⚠️ à adapter" : "")
          + (f && f.ressenti ? ' · <span class="ressenti">' + RESSENTIS[f.ressenti].split(" ")[0] + '</span>' : "")
          + (f && f.date !== date ? " · faite le " + dateCourte(f.date) : "") + '</div></div></div>';
      });
      exJour.forEach(function(f){
        h += '<div class="seance faite">'
          + '<button type="button" class="coche fait" data-a="retirer-fait" data-id="' + f.id + '" aria-label="Retirer cette séance">' + SVG_COCHE + '</button>'
          + '<span class="emo">' + act(f.activite).e + '</span>'
          + '<div class="corps" data-a="modifier-fait" data-id="' + f.id + '"><div class="t">' + esc(f.titre || act(f.activite).nom) + '<span class="badge-plus">EN PLUS</span></div>'
          + '<div class="s">' + (f.duree ? f.duree + " min" : "") + (f.ressenti ? ' · <span class="ressenti">' + RESSENTIS[f.ressenti].split(" ")[0] + '</span>' : "") + '</div></div></div>';
      });
      if(!duJour.length && !exJour.length) h += '<div class="repos">Repos 😴</div>';
      h += '</div>';
    }

    if(!futur) h += '<button type="button" class="btn doux plein" data-a="ajout-fait" style="margin-top:.3rem">＋ J\'ai fait une autre séance</button>';

    if(etat === "joker"){
      h += '<div class="bandeau" style="margin-top:.75rem">🃏 Joker posé sur cette semaine.<div class="actions"><button type="button" class="btn" data-a="retirer-joker">Retirer le joker</button></div></div>';
    } else if((etat === "incomplete" || etat === "encours") && st.jokersDispo > 0){
      h += '<div class="bandeau" style="margin-top:.75rem">Semaine compliquée (vacances, maladie…) ? Pose un joker 🃏 : ta série ne sera pas cassée. '
        + '<span class="muted">Il t\'en reste ' + st.jokersDispo + '.</span><div class="actions"><button type="button" class="btn" data-a="poser-joker">Poser un joker</button></div></div>';
    }
    h += '<p class="petit muted" style="margin-top:.9rem">Une semaine est <b>complète</b> quand tu fais au moins autant de séances que prévu. Les séances en plus comptent aussi.</p>';
    $("#view-semaine").innerHTML = h;
  }

  function cocher(wk, id){
    var f = faitDuCreneau(wk, id);
    if(f){
      D.faits = D.faits.filter(function(x){ return x !== f; });
      sauver(); toutAfficher();
      toast("Séance décochée", [{ lib: "Annuler", fn: function(){ D.faits.push(f); sauver(); toutAfficher(); } }]);
      return;
    }
    var s = planDe(wk).find(function(x){ return x.id === id; });
    if(!s) return;
    var prevu = dateDuJour(wk, s.j), auj = aujourdhui();
    var nf = { id: uid(), sem: wk, slot: id, date: prevu > auj ? auj : prevu, activite: s.activite, titre: s.titre || "",
      duree: Number(s.duree) || 0, ressenti: null, note: "", le: Date.now() };
    D.faits.push(nf);
    sauver(); toutAfficher();
    if(navigator.vibrate) try { navigator.vibrate(30); } catch(e){}
    demanderRessenti(nf);
    verifierRecompenses();
  }

  var BRAVOS = ["Bravo !", "Bien joué !", "Yes ! 💥", "Une de plus !", "Au top !", "Champion·ne !"];
  function demanderRessenti(f){
    toast(BRAVOS[Math.floor(Math.random() * BRAVOS.length)] + " Ressenti ?", [1, 2, 3].map(function(n){
      return { lib: RESSENTIS[n].split(" ")[0], fn: function(){ f.ressenti = n; sauver(); toutAfficher(); } };
    }), 5000);
  }

  function htmlRessenti(valeur){
    return '<div class="choix" data-groupe="ressenti">' + [1, 2, 3].map(function(n){
      return '<button type="button" data-a="choix-ressenti" data-v="' + n + '" class="' + (valeur === n ? "on" : "") + '">' + RESSENTIS[n] + '</button>';
    }).join("") + '</div>';
  }

  function phaseActuelle(p, wk){
    if(!p || !p.debut || !p.progression) return null;
    var k = ecartSemaines(p.debut, wk) + 1;
    if(k < 1 || k > p.semaines) return { k: k, textes: [] };
    return { k: k, textes: p.progression.filter(function(ph){ return ph.de <= k && k <= ph.a; }).map(function(ph){ return ph.txt; }) };
  }

  function ouvrirDetailCreneau(wk, id){
    var s = planDe(wk).find(function(x){ return x.id === id; });
    if(!s) return;
    var f = faitDuCreneau(wk, id), p = s.prog ? progDe(s.prog) : null;
    var seance = p && p.seances[s.seance] ? p.seances[s.seance] : null;
    var futur = wk > semaineCourante();
    var h = '<p class="muted" style="margin-top:-.4rem">' + act(s.activite).e + " " + esc(act(s.activite).nom) + " · " + JOURS[s.j] + " " + dateCourte(dateDuJour(wk, s.j))
      + (s.duree ? " · " + s.duree + " min" : "") + '</p>';
    if(p){
      var ph = phaseActuelle(p, wk);
      h += '<div class="bandeau">📋 <b>' + esc(p.nom) + '</b>'
        + (ph && ph.k >= 1 && ph.k <= p.semaines ? '<br><span class="petit">Semaine ' + ph.k + ' sur ' + p.semaines + (ph.textes.length ? " — " + esc(ph.textes.join(" ")) : "") + '</span>' : "")
        + '</div>';
    }
    if(seance) h += '<div class="card">' + htmlExos(seance.exos) + '</div>';
    if(f){
      h += '<div class="card"><b>✅ Séance faite le ' + dateCourte(f.date) + '</b>'
        + '<div class="q" style="margin-top:.6rem">Comment c\'était ?</div>' + htmlRessenti(f.ressenti)
        + '<label class="champ"><span>Note (facultatif)</span><textarea id="note-fait" placeholder="Ex. : 3 km sans m\'arrêter, charge 8 kg…">' + esc(f.note) + '</textarea></label></div>'
        + '<div class="rangee-btn"><button type="button" class="btn principal" data-a="enreg-detail" data-id="' + f.id + '">Enregistrer</button>'
        + '<button type="button" class="btn" data-a="decocher-detail" data-id="' + id + '">Décocher</button></div>';
    } else if(!futur){
      h += '<button type="button" class="btn principal plein" data-a="cocher-detail" data-id="' + id + '">✅ C\'est fait !</button>';
    }
    h += '<button type="button" class="btn doux plein" style="margin-top:.5rem" data-a="modifier-dans-planning" data-id="' + id + '">✎ Modifier dans le planning</button>';
    ouvrirFeuille(titreDe(s), h, function(el){ el.dataset.wk = wk; });
  }

  /* Séance faite « en plus » : ajout ou modification. */
  function ouvrirFormFait(wk, idFait){
    var f = idFait ? D.faits.find(function(x){ return x.id === idFait; }) : null;
    var cur = semaineCourante(), auj = aujourdhui();
    var b = f ? cloner(f) : { activite: "renfo", titre: "", duree: 30, ressenti: null, note: "",
      date: wk === cur ? auj : dateDuJour(wk, 0) };
    var options = "";
    for(var j = 0; j < 7; j++){
      var d = dateDuJour(wk, j);
      if(d > auj) break;
      options += '<option value="' + d + '"' + (d === b.date ? " selected" : "") + '>' + JOURS[j] + " " + dateCourte(d) + '</option>';
    }
    var h = '<label class="champ"><span>Quel jour ?</span><select id="ff-date">' + options + '</select></label>'
      + '<div class="q">Activité</div>' + htmlChoixActivite(b.activite)
      + '<label class="champ"><span>Titre (facultatif)</span><input type="text" id="ff-titre" maxlength="60" value="' + esc(b.titre) + '" placeholder="Ex. : Footing au parc"></label>'
      + '<div class="q">Durée</div>' + htmlChoixDuree(b.duree)
      + '<div class="q">Ressenti</div>' + htmlRessenti(b.ressenti)
      + '<label class="champ"><span>Note (facultatif)</span><textarea id="ff-note">' + esc(b.note) + '</textarea></label>'
      + '<div class="rangee-btn"><button type="button" class="btn principal" data-a="enreg-fait" data-id="' + (f ? f.id : "") + '">Enregistrer</button>'
      + (f ? '<button type="button" class="btn danger" data-a="suppr-fait" data-id="' + f.id + '">Supprimer</button>' : "") + '</div>';
    ouvrirFeuille(f ? "Séance en plus" : "J'ai fait une séance", h, function(el){ el.dataset.wk = wk; });
  }

  function htmlChoixActivite(val){
    return '<div class="choix grille" data-groupe="activite">' + Object.keys(ACTIVITES).map(function(k){
      return '<button type="button" data-a="choix-activite" data-v="' + k + '" class="' + (k === val ? "on" : "") + '"><span class="e">' + ACTIVITES[k].e + '</span>' + esc(ACTIVITES[k].nom) + '</button>';
    }).join("") + '</div>';
  }
  var DUREES = [10, 15, 20, 30, 45, 60, 90];
  function htmlChoixDuree(val){
    return '<div class="choix" data-groupe="duree">' + DUREES.map(function(d){
      return '<button type="button" data-a="choix-duree" data-v="' + d + '" class="' + (Number(val) === d ? "on" : "") + '">' + d + ' min</button>';
    }).join("") + '</div><label class="champ"><span class="muted petit">ou une autre durée (minutes)</span><input type="number" id="champ-duree" min="1" max="600" inputmode="numeric" value="' + (val || "") + '"></label>';
  }
  function valeurGroupe(el, nom){
    var on = $('[data-groupe="' + nom + '"] .on', el);
    return on ? on.dataset.v : null;
  }

  /* ---------------- Planning ---------------- */
  function afficherPlanning(){
    var cur = semaineCourante(), type = planMode === "type", wk = planVue;
    var h = '<div class="segment"><button type="button" data-a="plan-mode" data-v="semaine" class="' + (!type ? "actif" : "") + '">Une semaine</button>'
      + '<button type="button" data-a="plan-mode" data-v="type" class="' + (type ? "actif" : "") + '">Ma semaine type</button></div>';
    var plan;
    if(type){
      plan = D.semaineType;
      h += '<p class="petit muted" style="margin-top:0">Ta <b>semaine type</b> se répète automatiquement chaque semaine. Tu peux ensuite ajuster une semaine précise dans « Une semaine ».</p>';
    } else {
      plan = planDe(wk);
      h += navSemaine(wk, "plan-nav", D.reglages.debut, decalerSemaine(cur, 26));
      if(wk < cur) h += '<p class="petit muted" style="margin-top:0">Semaine passée.</p>';
      else if(D.semaines[wk]) h += '<div class="bandeau">✏️ Planning modifié pour cette semaine seulement.<div class="actions"><button type="button" class="btn" data-a="revenir-type">Revenir à la semaine type</button></div></div>';
      else h += '<p class="petit muted" style="margin-top:0">Cette semaine suit ta semaine type. Si tu la modifies, seule cette semaine change.</p>';
    }
    var tri = trierCreneaux(plan), total = 0;
    for(var j = 0; j < 7; j++){
      var duJour = tri.filter(function(s){ return s.j === j; });
      h += '<div class="plan-jour"><div class="nom">' + JOURS_C[j] + (type ? "" : '<small>' + dateCourte(dateDuJour(wk, j)) + '</small>') + '</div><div class="puces">';
      duJour.forEach(function(s){
        total += Number(s.duree) || 0;
        h += '<button type="button" class="puce" data-a="editer-creneau" data-id="' + s.id + '">' + act(s.activite).e + ' <span>' + esc(titreDe(s)) + (s.duree ? " · " + s.duree + "′" : "") + '</span></button>';
      });
      if(!duJour.length) h += '<span class="muted petit">—</span>';
      h += '</div><button type="button" class="ajout" data-a="ajouter-creneau" data-j="' + j + '" aria-label="Ajouter une séance le ' + JOURS[j] + '">+</button></div>';
    }
    h += '<p class="petit muted">' + (plan.length ? pluriel(plan.length, "séance prévue", "séances prévues") + " · " + total + " min" : "Aucune séance prévue. Appuie sur « + » pour en ajouter.") + '</p>';
    if(type){
      h += '<div class="rangee-btn"><button type="button" class="btn doux" data-a="aller-programmes">📋 Depuis un programme</button>'
        + (plan.length ? '<button type="button" class="btn danger" data-a="vider-type">Vider</button>' : "") + '</div>';
    } else if(plan.length && wk >= cur){
      h += '<button type="button" class="btn doux plein" data-a="enreg-comme-type">⭐ Utiliser ce planning comme semaine type</button>';
    }
    $("#view-planning").innerHTML = h;
  }

  /* Éditeur d'une séance prévue (semaine type ou semaine précise). */
  function ouvrirEditeurCreneau(ctx){
    var liste = ctx.type ? D.semaineType : planDe(ctx.wk);
    var s = ctx.id ? liste.find(function(x){ return x.id === ctx.id; }) : null;
    var b = s ? cloner(s) : { j: ctx.j, activite: "renfo", titre: "", duree: 30, prog: null, seance: null };
    var optJours = JOURS.map(function(n, j){ return '<option value="' + j + '"' + (j === b.j ? " selected" : "") + '>' + n + '</option>'; }).join("");
    var optProg = '<option value="">— Aucune —</option>' + D.programmes.map(function(p){
      return '<optgroup label="' + esc(p.nom) + '">' + p.seances.map(function(se, i){
        return '<option value="' + p.id + "|" + i + '"' + (b.prog === p.id && b.seance === i ? " selected" : "") + '>' + esc(se.titre) + '</option>';
      }).join("") + '</optgroup>';
    }).join("");
    var h = '<p class="petit muted" style="margin-top:-.4rem">' + (ctx.type ? "Semaine type (se répète chaque semaine)" : "Semaine " + libSemaine(ctx.wk) + " seulement") + '</p>'
      + (D.programmes.length ? '<label class="champ"><span>Séance d\'un de mes programmes</span><select id="ec-prog">' + optProg + '</select></label>' : "")
      + '<label class="champ"><span>Jour</span><select id="ec-jour">' + optJours + '</select></label>'
      + '<div class="q">Activité</div>' + htmlChoixActivite(b.activite)
      + '<label class="champ"><span>Titre (facultatif)</span><input type="text" id="ec-titre" maxlength="60" value="' + esc(b.titre) + '" placeholder="Ex. : Footing, Renfo jambes…"></label>'
      + '<div class="q">Durée</div>' + htmlChoixDuree(b.duree)
      + '<div class="rangee-btn"><button type="button" class="btn principal" data-a="enreg-creneau">Enregistrer</button>'
      + (s ? '<button type="button" class="btn danger" data-a="suppr-creneau">Supprimer</button>' : "") + '</div>';
    ouvrirFeuille(s ? "Modifier la séance" : "Prévoir une séance", h, function(el){
      el.dataset.ctx = JSON.stringify(ctx);
      var sel = $("#ec-prog", el);
      if(sel) sel.addEventListener("change", function(){
        if(!sel.value) return;
        var parts = sel.value.split("|"), p = progDe(parts[0]), se = p && p.seances[Number(parts[1])];
        if(!se) return;
        $("#ec-titre", el).value = se.titre;
        $("#champ-duree", el).value = se.duree;
        $$('[data-groupe="duree"] button', el).forEach(function(x){ x.classList.toggle("on", Number(x.dataset.v) === Number(se.duree)); });
        $$('[data-groupe="activite"] button', el).forEach(function(x){ x.classList.toggle("on", x.dataset.v === se.activite); });
      });
    });
  }

  function enregistrerCreneau(el){
    var ctx = JSON.parse(el.dataset.ctx);
    var liste = ctx.type ? D.semaineType : planModifiable(ctx.wk);
    var sel = $("#ec-prog", el), lien = sel && sel.value ? sel.value.split("|") : null;
    var duree = Number($("#champ-duree", el).value) || Number(valeurGroupe(el, "duree")) || 0;
    var donnees = {
      j: Number($("#ec-jour", el).value), activite: valeurGroupe(el, "activite") || "autre",
      titre: $("#ec-titre", el).value.trim(), duree: duree,
      prog: lien ? lien[0] : null, seance: lien ? Number(lien[1]) : null
    };
    var s = ctx.id ? liste.find(function(x){ return x.id === ctx.id; }) : null;
    if(s) Object.assign(s, donnees);
    else liste.push(Object.assign({ id: uid() }, donnees));
    sauver(); fermerFeuille(); toutAfficher();
  }

  /* ---------------- Programmes ---------------- */
  var MODELES = [];
  function preparerModeles(){
    var defs = [
      { nom: "Remise en forme maison", g: { objectif: "forme", niveau: 1, activites: ["renfo", "cardio"], zones: ["total"], lieu: "maison", materiel: [], contraintes: ["saut"], seances: 3, duree: 20, semaines: 6, jours: [0, 2, 4], echauffement: true } },
      { nom: "HIIT express", g: { objectif: "perte", niveau: 2, activites: ["hiit"], zones: ["total"], lieu: "maison", materiel: [], contraintes: [], seances: 3, duree: 20, semaines: 8, jours: [0, 2, 4], echauffement: true } },
      { nom: "Objectif 5 km", g: { objectif: "course", niveau: 1, activites: ["cardio", "renfo"], zones: ["jambes"], lieu: "exterieur", materiel: [], contraintes: [], seances: 3, duree: 30, semaines: 8, jours: [1, 3, 6], echauffement: true } },
      { nom: "Renfo haltères", g: { objectif: "renfo", niveau: 2, activites: ["renfo"], zones: ["total"], lieu: "maison", materiel: ["halteres"], contraintes: [], seances: 3, duree: 45, semaines: 8, jours: [0, 2, 4], echauffement: true } },
      { nom: "Dos en forme", g: { objectif: "dos", niveau: 1, activites: ["pilates"], zones: ["dos"], lieu: "maison", materiel: ["tapis", "elastique"], contraintes: ["dos"], seances: 3, duree: 20, semaines: 6, jours: [0, 2, 4], echauffement: true } },
      { nom: "Souplesse & détente", g: { objectif: "zen", niveau: 1, activites: ["yoga"], zones: ["total"], lieu: "maison", materiel: ["tapis"], contraintes: [], seances: 2, duree: 20, semaines: 4, jours: [2, 6], echauffement: true } }
    ];
    MODELES = defs.map(function(d, i){
      var p = genererProgramme(avecDispense(cloner(d.g)), 1000 + i * 7);
      p.id = "modele-" + i; p.nom = d.nom; p.origine = "modele";
      return p;
    });
  }

  function infoSemaineProg(p){
    if(!p.debut) return "";
    var k = ecartSemaines(p.debut, semaineCourante()) + 1;
    if(k < 1) return '<span class="pastille">Démarre le ' + dateCourte(p.debut) + '</span>';
    if(k > p.semaines) return '<span class="pastille">Terminé 🎉</span>';
    return '<span class="pastille">Sem. ' + k + '/' + p.semaines + '</span>';
  }

  function afficherProgrammes(){
    var h = '<button type="button" class="gros-btn" data-a="generateur"><span class="e">✨</span><span><b>Créer mon programme personnalisé</b><small>Objectif, niveau, matériel, durée… on s\'occupe du reste.</small></span></button>'
      + '<button type="button" class="btn doux plein" data-a="nouveau-programme">✍️ Noter un programme à la main</button>'
      + (dispenseActive()
        ? '<div class="bandeau" style="margin-top:.6rem">🩹 <b>Dispense :</b> ' + esc(libDispense()) + '. Les programmes générés en tiennent compte. <a href="#" data-a="ouvrir-dispense">Modifier</a></div>'
        : '<button type="button" class="btn doux plein" style="margin-top:.5rem" data-a="ouvrir-dispense">🩹 Une douleur, une dispense ? Indique-la</button>');
    h += '<div class="titre-section">Mes programmes</div>';
    if(!D.programmes.length){
      h += '<div class="card vide"><div class="e">📋</div>Aucun programme pour l\'instant.<br>Génère-en un, note celui de ton coach, ou pars d\'une idée ci-dessous.</div>';
    } else {
      D.programmes.forEach(function(p){
        h += '<div class="card prog" data-a="ouvrir-programme" data-id="' + p.id + '"><span class="e">' + esc(p.emoji || "📋") + '</span>'
          + '<div class="c"><b>' + esc(p.nom) + infoSemaineProg(p) + (conflits(p) ? ' <span title="À adapter à ta dispense">⚠️</span>' : "") + '</b><small>' + esc(resumeProg(p)) + '</small></div><span class="muted">›</span></div>';
      });
    }
    h += '<div class="titre-section">Idées pour démarrer</div>';
    MODELES.forEach(function(p){
      h += '<div class="card prog" data-a="ouvrir-modele" data-id="' + p.id + '"><span class="e">' + esc(p.emoji) + '</span>'
        + '<div class="c"><b>' + esc(p.nom) + '</b><small>' + esc(resumeProg(p)) + '</small></div><span class="muted">›</span></div>';
    });
    $("#view-programmes").innerHTML = h;
  }

  var NIVEAUX = { 1: "Débutant", 2: "Intermédiaire", 3: "Confirmé" };
  function resumeProg(p){
    var bouts = [];
    if(p.parSemaine) bouts.push(p.parSemaine + "×/sem.");
    else if(p.seances && p.seances.length) bouts.push(pluriel(p.seances.length, "séance"));
    if(p.duree) bouts.push(p.duree + " min");
    if(p.semaines) bouts.push(p.semaines + " semaines");
    if(p.niveau) bouts.push(NIVEAUX[p.niveau]);
    return bouts.join(" · ");
  }

  function htmlExos(exos){
    if(!exos || !exos.length) return '<p class="muted petit">Aucun exercice noté.</p>';
    var h = "", sec = null;
    exos.forEach(function(x){
      if((x.sec || "") !== sec){ sec = x.sec || ""; if(sec) h += '<div class="bloc-titre">' + esc(sec) + '</div>'; }
      var r = raisonDispense(x.nom);
      h += '<div class="exo' + (r ? " a-eviter" : "") + '"><div class="l1"><b>' + esc(x.nom) + '</b>' + (x.dose ? '<span class="dose">' + esc(x.dose) + '</span>' : "") + '</div>'
        + (r ? '<div class="avert">⚠️ À éviter avec ta dispense (' + esc(r) + ')</div>' : "")
        + ((x.cons || x.repos) ? '<div class="cons">' + esc(x.cons || "") + (x.repos ? (x.cons ? " · " : "") + "Récup " + esc(x.repos) : "") + '</div>' : "") + '</div>';
    });
    return h;
  }

  function htmlProgramme(p){
    var h = '<p class="muted" style="margin-top:-.4rem">' + esc(p.objectif || "") + (p.objectif ? " · " : "") + esc(resumeProg(p)) + '</p>';
    if(p.materiel && p.materiel.length) h += '<p class="petit"><b>Matériel :</b> ' + esc(p.materiel.join(", ")) + '</p>';
    if(p.but) h += '<div class="bandeau">🎯 <b>Mon but :</b> ' + esc(p.but) + '</div>';
    if(p.debut){
      var k = ecartSemaines(p.debut, semaineCourante()) + 1;
      if(k >= 1 && k <= p.semaines){
        h += '<div class="card"><b>Semaine ' + k + ' sur ' + p.semaines + '</b><div class="barre"><i style="width:' + Math.round(100 * k / p.semaines) + '%"></i></div></div>';
      }
    }
    if(p.notes) h += '<div class="card"><b>Notes</b><p style="white-space:pre-wrap;margin:.3rem 0 0">' + esc(p.notes) + '</p></div>';
    if(p.progression && p.progression.length){
      h += '<div class="titre-section">Progression</div><div class="card">' + p.progression.map(function(ph){
        return '<div class="phase"><span class="sem">' + (ph.de === ph.a ? "Sem. " + ph.de : "Sem. " + ph.de + "–" + ph.a) + '</span><span>' + esc(ph.txt) + '</span></div>';
      }).join("") + '</div>';
    }
    h += '<div class="titre-section">Séances</div>';
    (p.seances || []).forEach(function(s){
      h += '<div class="card"><b>' + act(s.activite).e + " " + esc(s.titre) + '</b> <span class="muted petit">' + (s.duree ? "· " + s.duree + " min" : "") + '</span>' + htmlExos(s.exos) + '</div>';
    });
    if(p.genere) h += '<div class="note-sante">Programme indicatif, à adapter à tes sensations. En cas de douleur, de reprise après une blessure ou d\'un souci de santé, demande l\'avis d\'un médecin avant de commencer.</div>';
    return h;
  }

  function ouvrirProgramme(p, estModele){
    var nc = conflits(p), h = "";
    if(nc){
      h += '<div class="bandeau alerte">🩹 ' + pluriel(nc, "exercice ne convient pas", "exercices ne conviennent pas") + ' à ta dispense (' + esc(libDispense()) + ').'
        + (estModele ? "" : '<div class="actions"><button type="button" class="btn principal" data-a="adapter-programme" data-id="' + p.id + '">🔄 Les remplacer par des exercices adaptés</button></div>') + '</div>';
    }
    h += htmlProgramme(p) + '<div style="height:.8rem"></div>';
    if(estModele){
      h += '<button type="button" class="btn principal plein" data-a="garder-modele" data-id="' + p.id + '">➕ Ajouter à mes programmes</button>';
    } else {
      h += '<button type="button" class="btn principal plein" data-a="prog-vers-type" data-id="' + p.id + '">📅 Mettre dans ma semaine type</button>'
        + '<div class="rangee-btn" style="margin-top:.5rem"><button type="button" class="btn" data-a="editer-programme" data-id="' + p.id + '">✎ Modifier</button>'
        + '<button type="button" class="btn" data-a="dupliquer-programme" data-id="' + p.id + '">⧉ Dupliquer</button></div>'
        + (p.params ? '<button type="button" class="btn doux plein" style="margin-top:.5rem" data-a="regenerer" data-id="' + p.id + '">🔁 Refaire avec d\'autres choix</button>' : "")
        + '<button type="button" class="btn danger plein" style="margin-top:.5rem" data-a="suppr-programme" data-id="' + p.id + '">Supprimer ce programme</button>';
    }
    ouvrirFeuille((p.emoji && p.nom.indexOf(p.emoji) !== 0 ? p.emoji + " " : "") + p.nom, h);
  }

  var JOURS_PAR_DEFAUT = { 1: [2], 2: [1, 4], 3: [0, 2, 4], 4: [0, 1, 3, 5], 5: [0, 1, 2, 4, 5], 6: [0, 1, 2, 3, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6] };
  function ouvrirVersSemaineType(p){
    var n = p.parSemaine || p.seances.length || 3;
    var jours = (p.jours && p.jours.length) ? p.jours.slice() : (JOURS_PAR_DEFAUT[Math.min(7, n)] || [0, 2, 4]);
    var h = '<p class="petit muted" style="margin-top:-.4rem">Choisis tes jours d\'entraînement : les séances du programme y seront placées à tour de rôle (' + esc(p.seances.map(function(s){ return s.titre.split(" · ")[0]; }).join(", ")) + ').</p>'
      + '<div class="q">Mes jours <small>(' + n + ' conseillé' + (n > 1 ? "s" : "") + ')</small></div>'
      + '<div class="choix" data-groupe="jours">' + JOURS.map(function(nom, j){
        return '<button type="button" data-a="basculer" data-v="' + j + '" class="' + (jours.indexOf(j) >= 0 ? "on" : "") + '">' + JOURS_C[j] + '</button>';
      }).join("") + '</div>'
      + '<div class="q">Ma semaine type actuelle</div>'
      + '<div class="choix liste" data-groupe="remplacer">'
      + '<button type="button" data-a="choix-unique" data-v="1" class="on">Remplacer par ce programme</button>'
      + '<button type="button" data-a="choix-unique" data-v="0">Ajouter ces séances à ce qui est déjà prévu</button></div>'
      + '<div class="q">Je commence</div>'
      + '<div class="choix" data-groupe="debut">'
      + '<button type="button" data-a="choix-unique" data-v="0" class="on">Cette semaine</button>'
      + '<button type="button" data-a="choix-unique" data-v="1">La semaine prochaine</button></div>'
      + '<button type="button" class="btn principal plein" data-a="valider-vers-type" data-id="' + p.id + '">C\'est parti !</button>'
      + '<button type="button" class="btn plein" style="margin-top:.5rem" data-a="fermer">Plus tard</button>';
    ouvrirFeuille("Dans ma semaine type", h);
  }

  function validerVersType(el, p){
    var jours = $$('[data-groupe="jours"] .on', el).map(function(b){ return Number(b.dataset.v); }).sort();
    if(!jours.length){ toast("Choisis au moins un jour."); return; }
    var remplacer = valeurGroupe(el, "remplacer") === "1";
    var cur = semaineCourante();
    var debut = valeurGroupe(el, "debut") === "1" ? decalerSemaine(cur, 1) : cur;
    // Si on démarre la semaine prochaine, la semaine en cours garde l'ancien planning.
    if(debut !== cur && !D.semaines[cur]) D.semaines[cur] = cloner(D.semaineType);
    if(debut === cur && D.semaines[cur] && !faitsDe(cur).length) delete D.semaines[cur];
    var creneaux = jours.map(function(j, i){
      var idx = i % p.seances.length, s = p.seances[idx];
      return { id: uid(), j: j, activite: s.activite, titre: s.titre, duree: s.duree, prog: p.id, seance: idx };
    });
    D.semaineType = remplacer ? creneaux : D.semaineType.concat(creneaux);
    p.debut = debut;
    p.jours = jours;
    sauver(); fermerFeuille();
    planMode = "type";
    afficherVue("planning");
    toast("Ta semaine type est prête 💪");
  }

  /* Éditeur de programme (création à la main ou modification). */
  var brouillon = null;
  var EMOJIS_PROG = ["📋", "💪", "🏃", "🔥", "🧘", "🚴", "🏊", "🏋️", "⚡", "🤸", "🥊", "🎯"];
  function ouvrirEditeurProgramme(p){
    brouillon = p ? cloner(p) : { id: null, nom: "", emoji: "📋", objectif: "", but: "", semaines: "", notes: "",
      seances: [{ titre: "Séance A", activite: "renfo", duree: 30, exos: [{ nom: "", dose: "" }] }] };
    rendreEditeurProgramme();
  }
  function rendreEditeurProgramme(){
    var b = brouillon;
    var h = '<label class="champ"><span>Nom du programme</span><input type="text" data-f="nom" maxlength="60" value="' + esc(b.nom) + '" placeholder="Ex. : Programme de mon coach"></label>'
      + '<div class="q">Icône</div><div class="choix">' + EMOJIS_PROG.map(function(e){
        return '<button type="button" data-a="prog-emoji" data-v="' + e + '" class="' + (b.emoji === e ? "on" : "") + '">' + e + '</button>';
      }).join("") + '</div>'
      + '<label class="champ"><span>Objectif / but (facultatif)</span><input type="text" data-f="but" maxlength="120" value="' + esc(b.but) + '" placeholder="Ex. : courir 10 km en mars"></label>'
      + '<label class="champ"><span>Durée du programme en semaines (facultatif)</span><input type="number" data-f="semaines" min="1" max="104" inputmode="numeric" value="' + esc(b.semaines) + '"></label>'
      + '<label class="champ"><span>Notes</span><textarea data-f="notes" placeholder="Conseils du coach, charges utilisées, sensations…">' + esc(b.notes) + '</textarea></label>'
      + '<div class="titre-section">Séances</div>';
    b.seances.forEach(function(s, i){
      h += '<div class="bloc-seance"><label class="champ"><span>Nom de la séance</span><input type="text" data-s="' + i + '" data-f="titre" maxlength="60" value="' + esc(s.titre) + '"></label>'
        + '<div class="ligne-exo" style="grid-template-columns:1fr 6rem"><select data-s="' + i + '" data-f="activite">' + Object.keys(ACTIVITES).map(function(k){
          return '<option value="' + k + '"' + (s.activite === k ? " selected" : "") + '>' + ACTIVITES[k].e + " " + esc(ACTIVITES[k].nom) + '</option>';
        }).join("") + '</select><input type="number" data-s="' + i + '" data-f="duree" min="1" max="600" inputmode="numeric" value="' + esc(s.duree) + '" aria-label="Durée en minutes" placeholder="min"></div>'
        + '<div class="petit muted" style="margin:.4rem 0 .3rem">Exercices <span>(nom · séries/durée, ex. « 3 × 12 » ou « 30 s »)</span></div>';
      s.exos.forEach(function(x, k){
        h += '<div class="ligne-exo"><input type="text" data-s="' + i + '" data-x="' + k + '" data-f="nom" value="' + esc(x.nom) + '" placeholder="Exercice">'
          + '<input type="text" data-s="' + i + '" data-x="' + k + '" data-f="dose" value="' + esc(x.dose) + '" placeholder="3 × 12">'
          + '<button type="button" data-a="ep-suppr-exo" data-s="' + i + '" data-x="' + k + '" aria-label="Retirer">✕</button></div>';
      });
      h += '<div class="rangee-btn"><button type="button" class="btn doux" data-a="ep-ajout-exo" data-s="' + i + '">＋ Exercice</button>'
        + (b.seances.length > 1 ? '<button type="button" class="btn danger" data-a="ep-suppr-seance" data-s="' + i + '">Retirer la séance</button>' : "") + '</div></div>';
    });
    h += '<button type="button" class="btn doux plein" data-a="ep-ajout-seance">＋ Ajouter une séance</button>'
      + '<div style="height:.8rem"></div><button type="button" class="btn principal plein" data-a="ep-enreg">Enregistrer le programme</button>';
    var hautAvant = feuilleOuverte ? $("#feuille").scrollTop : 0;
    ouvrirFeuille(b.id ? "Modifier le programme" : "Noter un programme", h, function(el){ el.scrollTop = hautAvant; });
  }
  function majBrouillon(e){
    var t = e.target, f = t.dataset && t.dataset.f;
    if(!f || !brouillon) return;
    if(t.dataset.x !== undefined) brouillon.seances[Number(t.dataset.s)].exos[Number(t.dataset.x)][f] = t.value;
    else if(t.dataset.s !== undefined) brouillon.seances[Number(t.dataset.s)][f] = f === "duree" ? (Number(t.value) || "") : t.value;
    else brouillon[f] = f === "semaines" ? (Number(t.value) || "") : t.value;
  }
  function enregistrerBrouillon(){
    var b = brouillon;
    b.nom = (b.nom || "").trim() || "Mon programme";
    b.seances.forEach(function(s, i){
      s.titre = (s.titre || "").trim() || "Séance " + String.fromCharCode(65 + i);
      s.exos = s.exos.filter(function(x){ return (x.nom || "").trim(); });
    });
    if(b.id){
      var i = D.programmes.findIndex(function(p){ return p.id === b.id; });
      if(i >= 0) D.programmes[i] = b;
    } else {
      b.id = uid(); b.cree = aujourdhui(); b.origine = "main";
      D.programmes.push(b);
    }
    brouillon = null;
    sauver(); fermerFeuille(); toutAfficher();
    toast("Programme enregistré ✅");
    verifierRecompenses();
  }

  /* ================================================================
     Générateur de programme personnalisé
     ================================================================ */
  var G = null, etapeG = 1, apercuG = null;
  function choixParDefaut(){
    return { objectif: "forme", niveau: 1, but: "", activites: ["renfo"], zones: ["total"], lieu: "maison", materiel: [],
      contraintes: [], interdits: [], seances: 3, duree: 30, semaines: 8, jours: [], echauffement: true };
  }
  /* Ajoute la dispense en cours aux choix du générateur (ou d'une idée). */
  function avecDispense(g){
    var d = dispense();
    g.contraintes = (g.contraintes || []).slice();
    d.zones.forEach(function(z){ if(g.contraintes.indexOf(z) < 0) g.contraintes.push(z); });
    if(d.sansSaut && g.contraintes.indexOf("saut") < 0) g.contraintes.push("saut");
    g.interdits = d.exos.slice();
    return g;
  }
  function ouvrirGenerateur(params){
    G = avecDispense(Object.assign(choixParDefaut(), cloner(params || D.gen || {})));
    etapeG = 1; apercuG = null;
    rendreGenerateur();
  }

  var Q_ACTIVITES = { renfo: "💪 Renforcement", cardio: "🏃 Cardio (course, vélo, corde…)", hiit: "⚡ HIIT / circuits", yoga: "🧘 Yoga / étirements", pilates: "🤸 Pilates / gainage" };
  var Q_ZONES = { total: "Tout le corps", jambes: "Jambes & fessiers", haut: "Haut du corps", abdos: "Abdos / gainage", dos: "Dos & posture" };
  var Q_LIEUX = { maison: "🏠 À la maison", exterieur: "🌳 Dehors", salle: "🏟️ En salle de sport" };
  var Q_MATERIEL = { tapis: "Tapis", halteres: "Haltères", elastique: "Élastiques", kettlebell: "Kettlebell", corde: "Corde à sauter", traction: "Barre de traction", banc: "Banc", velo: "Vélo / home trainer" };
  var Q_CONTRAINTES = { saut: "🤫 Sans saut (voisins, appartement)" };
  Object.keys(ZONES_SENSIBLES).forEach(function(z){ Q_CONTRAINTES[z] = ZONES_SENSIBLES[z].e + " " + ZONES_SENSIBLES[z].nom + " à ménager"; });

  function chips(cle, options, multi){
    var val = G[cle];
    return '<div class="choix' + (options.__liste ? " liste" : "") + '">' + Object.keys(options).filter(function(k){ return k !== "__liste"; }).map(function(k){
      var on = multi ? val.indexOf(isNaN(k) ? k : Number(k)) >= 0 || val.indexOf(k) >= 0 : String(val) === String(k);
      return '<button type="button" data-a="g-choix" data-cle="' + cle + '" data-v="' + k + '" data-multi="' + (multi ? 1 : 0) + '" class="' + (on ? "on" : "") + '">' + options[k] + '</button>';
    }).join("") + '</div>';
  }

  function rendreGenerateur(){
    var h = '<div class="etapes">' + [1, 2, 3, 4, 5].map(function(n){ return '<i class="' + (n <= etapeG ? "on" : "") + '"></i>'; }).join("") + '</div>';
    if(etapeG === 1){
      var objs = { __liste: 1 };
      Object.keys(OBJECTIFS).forEach(function(k){ objs[k] = OBJECTIFS[k].e + " " + OBJECTIFS[k].nom; });
      h += '<div class="q">Quel est ton objectif principal ?</div>' + chips("objectif", objs)
        + '<div class="q">Ton niveau</div>' + chips("niveau", { 1: "🌱 Débutant·e", 2: "🌿 Intermédiaire", 3: "🌳 Confirmé·e" })
        + '<label class="champ"><span>Ton but en une phrase <span class="muted">(facultatif)</span></span><input type="text" id="g-but" maxlength="120" value="' + esc(G.but) + '" placeholder="Ex. : courir 5 km sans m\'arrêter en juin"></label>';
    } else if(etapeG === 2){
      h += '<div class="q">Ce que tu aimes faire <small>(plusieurs choix possibles)</small></div>' + chips("activites", Object.assign({ __liste: 1 }, Q_ACTIVITES), true)
        + '<div class="q">Les zones à travailler en priorité</div>' + chips("zones", Q_ZONES, true);
    } else if(etapeG === 3){
      h += '<div class="q">Où t\'entraînes-tu surtout ?</div>' + chips("lieu", Q_LIEUX)
        + '<div class="q">Ton matériel <small>(rien coché = poids du corps)</small></div>' + chips("materiel", Q_MATERIEL, true)
        + '<div class="q">Des précautions à prendre ?</div>'
        + (dispenseActive() ? '<p class="petit muted" style="margin-top:0">🩹 Ta dispense est déjà cochée' + (G.interdits.length ? ", et tes " + pluriel(G.interdits.length, "exercice exclu", "exercices exclus") + " seront évités" : "") + '.</p>' : "")
        + chips("contraintes", Object.assign({ __liste: 1 }, Q_CONTRAINTES), true);
    } else if(etapeG === 4){
      h += '<div class="q">Combien de séances par semaine ?</div>' + chips("seances", { 2: "2", 3: "3", 4: "4", 5: "5", 6: "6" })
        + '<div class="q">Durée d\'une séance</div>' + chips("duree", { 15: "15 min", 20: "20 min", 30: "30 min", 45: "45 min", 60: "1 h" })
        + '<div class="q">Sur combien de temps ?</div>' + chips("semaines", { 4: "4 semaines", 6: "6 semaines", 8: "8 semaines", 12: "12 semaines" })
        + '<div class="q">Tes jours préférés <small>(facultatif)</small></div>' + chips("jours", { 0: "lun.", 1: "mar.", 2: "mer.", 3: "jeu.", 4: "ven.", 5: "sam.", 6: "dim." }, true)
        + '<div class="q">Échauffement et étirements inclus ?</div>' + chips("echauffement", { "true": "Oui, c'est mieux", "false": "Non, je gère" });
    } else {
      if(!apercuG) apercuG = genererProgramme(G, Math.floor(Math.random() * 1e9));
      h += htmlProgramme(apercuG);
    }
    h += '<div style="height:.9rem"></div>';
    if(etapeG < 5){
      h += '<div class="rangee-btn">' + (etapeG > 1 ? '<button type="button" class="btn" data-a="g-prec">← Retour</button>' : "")
        + '<button type="button" class="btn principal" data-a="g-suiv">' + (etapeG === 4 ? "✨ Générer mon programme" : "Suivant →") + '</button></div>';
    } else {
      h += '<button type="button" class="btn principal plein" data-a="g-garder">✅ Garder ce programme</button>'
        + '<div class="rangee-btn" style="margin-top:.5rem"><button type="button" class="btn" data-a="g-variante">🎲 Une autre variante</button>'
        + '<button type="button" class="btn" data-a="g-prec">← Mes choix</button></div>';
    }
    ouvrirFeuille(etapeG === 5 ? apercuG.nom : "Mon programme sur mesure", h, function(el){
      var but = $("#g-but", el);
      if(but) but.addEventListener("input", function(){ G.but = but.value; });
    });
  }

  function choixGenerateur(btn){
    var cle = btn.dataset.cle, v = btn.dataset.v, multi = btn.dataset.multi === "1";
    var num = ["niveau", "seances", "duree", "semaines", "jours"].indexOf(cle) >= 0;
    var val = num ? Number(v) : (v === "true" ? true : v === "false" ? false : v);
    if(multi){
      var l = G[cle], i = l.indexOf(val);
      if(i >= 0) l.splice(i, 1); else l.push(val);
      if(cle === "zones"){
        if(val === "total" && i < 0) G.zones = ["total"];
        else if(val !== "total") G.zones = G.zones.filter(function(z){ return z !== "total"; });
        if(!G.zones.length) G.zones = ["total"];
      }
    } else G[cle] = val;
    apercuG = null;
    var haut = $("#feuille").scrollTop;
    rendreGenerateur();
    $("#feuille").scrollTop = haut;
  }

  function aleatoire(graine){
    var s = (graine >>> 0) || 1;
    return function(){ s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  }

  /* Le cœur du générateur : construit les séances à partir des choix. */
  function genererProgramme(gIn, graine){
    var g = cloner(gIn), rnd = aleatoire(graine);
    var O = OBJECTIFS[g.objectif] || OBJECTIFS.forme, nv = Number(g.niveau) || 1;
    var mat = { aucun: 1 };
    (g.materiel || []).forEach(function(m){ mat[m] = 1; });
    if(g.lieu === "salle") ["salle", "halteres", "kettlebell", "banc", "traction", "elastique", "velo", "corde"].forEach(function(m){ mat[m] = 1; });
    var contraintes = (g.contraintes || []).slice();
    if(g.objectif === "dos" && contraintes.indexOf("dos") < 0) contraintes.push("dos");
    var zonesC = contraintes.filter(function(c){ return ZONES_SENSIBLES[c]; });
    var sansSaut = contraintes.indexOf("saut") >= 0 || zonesC.some(function(z){ return ZONES_SENSIBLES[z].sansSaut; });
    var appuisFragiles = zonesC.indexOf("genoux") >= 0 || zonesC.indexOf("chevilles") >= 0;
    var interdits = g.interdits || [];
    var pool = EXERCICES.filter(function(e){
      return e.m.some(function(m){ return mat[m]; }) && e.nv <= nv && !(sansSaut && e.imp) && !raisonEviter(e.n, zonesC, sansSaut, interdits);
    });
    var usage = {};
    var chargePreferee = g.objectif === "muscle" || (g.materiel || []).length > 0 || g.lieu === "salle";

    function score(e, focus){
      return (focus && e.z.indexOf(focus) >= 0 ? 3 : 0) + (chargePreferee && e.m.indexOf("aucun") < 0 ? 1.6 : 0)
        - (usage[e.n] || 0) * 1.4 + rnd() * 2.4 + (nv >= 2 && e.nv >= 2 ? .4 : 0);
    }
    function choisir(filtre, nb, focus, exclus){
      var c = pool.filter(function(e){ return filtre(e) && !exclus[e.n]; })
        .map(function(e){ return { e: e, s: score(e, focus) }; })
        .sort(function(a, b){ return b.s - a.s; }).slice(0, nb).map(function(x){ return x.e; });
      c.forEach(function(e){ usage[e.n] = (usage[e.n] || 0) + 1; exclus[e.n] = 1; });
      return c;
    }
    // Une sélection qui fait le tour des zones (séance « tout le corps »).
    function choisirEquilibre(filtre, nb, exclus, depart){
      var zones = ["jambes", "haut", "abdos", "dos"], res = [], essais = 0;
      while(res.length < nb && essais < nb * 3){
        var z = zones[(depart + essais) % zones.length];
        var un = choisir(function(e){ return filtre(e) && e.z.indexOf(z) >= 0; }, 1, z, exclus);
        if(!un.length) un = choisir(filtre, 1, null, exclus);
        res = res.concat(un); essais++;
      }
      return res;
    }
    function dosage(e, base){ return base + (e.uni ? " par côté" : ""); }

    var D0 = Number(g.duree) || 30;
    var echauf = g.echauffement ? (D0 <= 20 ? 4 : (D0 >= 45 ? 8 : 6)) : 0;
    var calme = g.echauffement ? (D0 <= 20 ? 3 : 5) : 0;
    var M = Math.max(8, D0 - echauf - calme);
    var toutCorps = !g.zones || !g.zones.length || g.zones.indexOf("total") >= 0;
    var zonesRot = toutCorps ? ["jambes", "haut", "abdos", "dos"] : g.zones;
    var LIB_ZONES = { jambes: "jambes & fessiers", haut: "haut du corps", abdos: "abdos & gainage", dos: "dos & posture" };

    function blocEchauffement(exclus, cardioDouce){
      if(!echauf) return [];
      if(cardioDouce) return [{ sec: "Échauffement", nom: "Échauffement progressif", dose: echauf + " min", cons: "Commence très doucement et accélère petit à petit." }];
      var l = ECHAUFFEMENT.filter(function(x){ return !(sansSaut && x.imp); });
      var nb = D0 <= 20 ? 3 : (echauf >= 8 ? 5 : 4), res = [], dep = Math.floor(rnd() * l.length);
      for(var i = 0; i < nb; i++) res.push(l[(dep + i) % l.length]);
      var sec = Math.round(echauf * 60 / nb / 15) * 15;
      var dose = sec < 60 ? sec + " s" : Math.floor(sec / 60) + " min" + (sec % 60 ? " " + (sec % 60) : "");
      return res.map(function(x){ return { sec: "Échauffement", nom: x.n, dose: dose, cons: x.t }; });
    }
    function blocCalme(focus, exclus){
      if(!calme) return [];
      var l = choisir(function(e){ return e.c === "mobilite" && e.n !== "Respiration abdominale"; }, D0 <= 20 ? 3 : 4, focus, exclus);
      return l.map(function(e){ return { sec: "Retour au calme", nom: e.n, dose: dosage(e, "30 s"), cons: e.t }; });
    }

    var PARAMS_FORCE = {
      renfo: { series: [2, 3, 4], reps: "10 à 12", repos: 60 },
      muscle: { series: [3, 4, 4], reps: "8 à 10", repos: 90 },
      dos: { series: [2, 3, 3], reps: "10", repos: 45 }
    };
    var TENUE = [20, 30, 40];

    function seanceForce(lettre, idx, exclus){
      var P = PARAMS_FORCE[g.objectif] || PARAMS_FORCE.renfo;
      var series = P.series[nv - 1], repos = P.repos;
      var focus = toutCorps ? null : zonesRot[idx % zonesRot.length];
      if(g.objectif === "dos") focus = "dos";
      var parExo = series * (40 + repos) + 20;
      var E = borner(Math.round(M * 60 / parExo), 3, 8);
      var liste;
      if(focus) liste = choisir(function(e){ return e.c === "force" || e.c === "gainage"; }, E, focus, exclus);
      else {
        liste = choisirEquilibre(function(e){ return e.c === "force"; }, E - 1, exclus, idx);
        liste = liste.concat(choisir(function(e){ return e.c === "gainage"; }, 1, "abdos", exclus));
      }
      var exos = blocEchauffement(exclus, false).concat(liste.map(function(e){
        return { sec: "Séance", nom: e.n, dose: dosage(e, series + " × " + (e.iso ? TENUE[nv - 1] + " s" : P.reps)), repos: repos + " s", cons: e.t };
      })).concat(blocCalme(focus, exclus));
      var titre = g.objectif === "dos" ? "Dos & posture" : "Renfo " + (focus ? LIB_ZONES[focus] : "tout le corps");
      return { titre: lettre + " · " + titre, activite: chargePreferee && g.lieu === "salle" ? "muscu" : "renfo", duree: D0, exos: exos };
    }

    function seanceCircuit(lettre, idx, exclus, hiit){
      var T = hiit ? [[30, 30], [40, 20], [40, 20]] : (g.objectif === "perte" ? [[30, 30], [40, 20], [45, 15]] : [[30, 30], [35, 25], [40, 20]]);
      var eff = T[nv - 1][0], rec = T[nv - 1][1];
      var E = [5, 6, 7][nv - 1];
      var tours = borner(Math.round(M * 60 / (E * (eff + rec) + 60)), 2, 6);
      if(tours >= 5){ E = 8; tours = borner(Math.round(M * 60 / (E * (eff + rec) + 60)), 2, 6); }
      var nbCardio = (hiit || g.objectif === "perte") ? Math.ceil(E / 2) : Math.floor(E / 3) + 1;
      var cardio = choisirEquilibre(function(e){ return e.c === "cardio"; }, nbCardio, exclus, idx);
      var force = choisirEquilibre(function(e){ return e.c === "force" || e.c === "gainage"; }, E - cardio.length, exclus, idx + 1);
      var liste = [];
      for(var i = 0; i < Math.max(cardio.length, force.length); i++){
        if(force[i]) liste.push(force[i]);
        if(cardio[i]) liste.push(cardio[i]);
      }
      var sec = "Circuit · " + tours + " tours (1 min de pause entre les tours)";
      var exos = blocEchauffement(exclus, false).concat(liste.map(function(e){
        return { sec: sec, nom: e.n, dose: eff + " s" + (e.uni ? " (alterne)" : ""), repos: rec + " s", cons: e.t };
      })).concat(blocCalme(null, exclus));
      return { titre: lettre + " · " + (hiit ? "HIIT" : (g.objectif === "perte" ? "Circuit brûle-graisse" : "Circuit forme")), activite: "hiit", duree: D0, exos: exos };
    }

    function supportsCardio(){
      var s = [];
      if(g.lieu === "exterieur") s.push(appuisFragiles ? "marche" : "course");
      if(mat.velo) s.push("velo");
      if(mat.salle) s.push("rameur");
      if(mat.corde && !sansSaut) s.push("corde");
      return s;
    }
    function seanceCardio(lettre, idx, exclus){
      var sup = supportsCardio();
      if(!sup.length){
        // Pas de support : cardio à la maison en continu, mouvements variés.
        var l = choisirEquilibre(function(e){ return e.c === "cardio"; }, 6, exclus, idx);
        var tours = borner(Math.round(M * 60 / (l.length * 60 + 60)), 2, 6);
        var sec = "Cardio maison · " + tours + " tours (1 min de pause entre les tours)";
        return { titre: lettre + " · Cardio maison", activite: "hiit", duree: D0,
          exos: blocEchauffement(exclus, false).concat(l.map(function(e){ return { sec: sec, nom: e.n, dose: "45 s", repos: "15 s", cons: e.t }; })).concat(blocCalme("jambes", exclus)) };
      }
      var s = sup[idx % sup.length], exos = blocEchauffement(exclus, true), main = [], activite = "course", nom = "Cardio";
      if(s === "marche"){
        activite = "marche"; nom = "Marche active";
        main.push({ nom: "Marche rapide", dose: M + " min", cons: "Allure soutenue : tu peux parler, mais pas chanter." });
      } else if(s === "course"){
        nom = "Course";
        if(nv === 1) main.push({ nom: "Course / marche alternées", dose: Math.max(3, Math.round(M / 3)) + " × (1 min de course + 2 min de marche)", cons: "Cours lentement, au point de pouvoir parler." });
        else if(nv === 2) main.push({ nom: "Footing facile", dose: Math.max(10, M - 6) + " min", cons: "Allure confortable, en aisance respiratoire." }, { nom: "Accélérations", dose: "4 × 30 s rapide / 1 min lent", cons: "Rapide mais relâché·e." });
        else main.push({ nom: "Fractionné", dose: Math.max(4, Math.round((M - 8) / 3)) + " × (2 min vite + 1 min trot)", cons: "Allure soutenue mais régulière sur toutes les répétitions." }, { nom: "Footing", dose: "8 min", cons: "Tranquille pour finir." });
      } else if(s === "velo"){
        activite = "velo"; nom = "Vélo";
        main.push({ nom: "Vélo endurance", dose: (nv === 1 ? M : Math.max(10, M - 12)) + " min", cons: "Cadence régulière, résistance modérée." });
        if(nv >= 2) main.push({ nom: "Intervalles", dose: "4 × (1 min résistance forte + 2 min facile)", cons: "Monte la résistance, garde une bonne cadence." });
      } else if(s === "rameur"){
        activite = "hiit"; nom = "Rameur / elliptique";
        main.push({ nom: nv === 1 ? "Elliptique" : "Rameur", dose: Math.max(10, M - (nv >= 2 ? 10 : 0)) + " min", cons: "Allure modérée et régulière." });
        if(nv >= 2) main.push({ nom: "Intervalles rameur", dose: "5 × (1 min fort + 1 min léger)", cons: "La poussée vient des jambes." });
      } else {
        activite = "hiit"; nom = "Corde à sauter";
        main.push({ nom: "Corde à sauter", dose: Math.max(5, Math.round(M / 1.5)) + " × (45 s de corde + 45 s de repos)", cons: "Petits sauts, sur l'avant des pieds." });
      }
      exos = exos.concat(main.map(function(x){ x.sec = "Séance"; return x; })).concat(blocCalme("jambes", exclus));
      return { titre: lettre + " · " + nom, activite: activite, duree: D0, exos: exos };
    }

    function seanceMobilite(lettre, idx, exclus){
      var zen = g.objectif === "zen";
      var tenue = [30, 40, 45][nv - 1];
      var E = borner(Math.round(M / 1.4), 4, 12);
      var l = choisirEquilibre(function(e){ return e.c === "mobilite" && e.n !== "Respiration abdominale"; }, E, exclus, idx);
      var exos = (echauf ? [{ sec: "Pour commencer", nom: "Respiration abdominale", dose: "1 min", cons: "Inspire 4 s par le nez en gonflant le ventre, souffle 6 s." }] : [])
        .concat(l.map(function(e){ return { sec: "Postures", nom: e.n, dose: dosage(e, tenue + " s"), cons: e.t }; }));
      if(zen) exos.push({ sec: "Pour finir", nom: "Relaxation allongée", dose: "2 min", cons: "Allongé·e sur le dos, yeux fermés, relâche chaque partie du corps." });
      return { titre: lettre + " · " + (zen ? "Yoga détente" : "Souplesse & mobilité"), activite: zen ? "yoga" : "etirements", duree: D0, exos: exos };
    }

    function seanceGainage(lettre, idx, exclus){
      var E = borner(Math.round(M * 60 / (3 * 50 + 20)), 4, 8);
      var l = choisir(function(e){ return e.c === "gainage"; }, E - 1, "abdos", exclus)
        .concat(choisir(function(e){ return e.c === "force" && e.z.indexOf("dos") >= 0; }, 1, "dos", exclus));
      var exos = blocEchauffement(exclus, false).concat(l.map(function(e){
        return { sec: "Séance", nom: e.n, dose: dosage(e, "3 × " + (e.iso ? TENUE[nv - 1] + " s" : "12")), repos: "20 s", cons: e.t };
      })).concat(blocCalme("dos", exclus));
      return { titre: lettre + " · Gainage & pilates", activite: "pilates", duree: D0, exos: exos };
    }

    function seanceCourse(lettre, genre, exclus){
      var exos = blocEchauffement(exclus, true), main = [], titre, duree = D0;
      if(genre === "frac"){
        titre = "Fractionné";
        if(nv === 1) main.push({ nom: "Course / marche", dose: Math.max(4, Math.round(M / 2.5)) + " × (1 min de course + 1 min 30 de marche)", cons: "La course doit rester facile : tu dois pouvoir parler." });
        else if(nv === 2) main.push({ nom: "Fractionné court", dose: Math.max(4, Math.round(M / 4.5)) + " × (3 min allure soutenue + 1 min 30 trot)", cons: "Allure que tu pourrais tenir 20 à 30 minutes." });
        else main.push({ nom: "Fractionné long", dose: Math.max(3, Math.round(M / 7)) + " × (1 km allure course + 2 min trot)", cons: "Vise l'allure de ton objectif de 10 km." });
      } else if(genre === "endu"){
        titre = "Footing";
        main.push(nv === 1 ? { nom: "Course / marche", dose: M + " min en alternant 2 min de course et 1 min de marche", cons: "Tout doux, l'endurance se construit lentement." }
          : { nom: "Footing en aisance", dose: M + " min", cons: "Tu dois pouvoir tenir une conversation." });
      } else {
        titre = "Sortie longue";
        duree = Math.round(D0 * 1.4 / 5) * 5;
        var ML = duree - echauf - calme;
        main.push(nv === 1 ? { nom: "Sortie longue course / marche", dose: ML + " min, 3 min de course + 1 min de marche", cons: "La plus longue de la semaine, la plus lente aussi." }
          : { nom: "Sortie longue", dose: ML + " min très facile", cons: "Lente et régulière : c'est elle qui fait progresser." });
      }
      exos = exos.concat(main.map(function(x){ x.sec = "Séance"; return x; })).concat(blocCalme("jambes", exclus));
      return { titre: lettre + " · " + titre, activite: "course", duree: duree, exos: exos };
    }

    // Quelles séances composent la semaine ?
    var n = borner(Number(g.seances) || 3, 1, 7), nbModeles = Math.min(n, 4);
    var types;
    if(O.type === "course"){
      types = { 1: ["frac"], 2: ["frac", "longue"], 3: ["frac", "force", "longue"], 4: ["frac", "endu", "force", "longue"] }[nbModeles];
    } else {
      var correspondance = { renfo: "force", cardio: "cardio", hiit: "hiit", yoga: "mobilite", pilates: "gainage" };
      var base = O.type === "posture" ? "force" : O.type;
      var liste = [base];
      (g.activites || []).forEach(function(a){ var t = correspondance[a]; if(t && liste.indexOf(t) < 0) liste.push(t); });
      if(O.type === "posture" && liste.indexOf("mobilite") < 0) liste.push("mobilite");
      types = [];
      for(var i = 0; i < nbModeles; i++) types.push(liste[i % liste.length]);
    }
    var compte = {}, seances = types.map(function(t, i){
      var lettre = String.fromCharCode(65 + i), idx = compte[t] || 0, exclus = {};
      compte[t] = idx + 1;
      if(t === "force") return seanceForce(lettre, idx, exclus);
      if(t === "circuit") return seanceCircuit(lettre, idx, exclus, false);
      if(t === "hiit") return seanceCircuit(lettre, idx, exclus, true);
      if(t === "cardio") return seanceCardio(lettre, idx, exclus);
      if(t === "mobilite") return seanceMobilite(lettre, idx, exclus);
      if(t === "gainage") return seanceGainage(lettre, idx, exclus);
      return seanceCourse(lettre, t, exclus);
    });

    // Progression semaine par semaine.
    var W = Number(g.semaines) || 8;
    var t1 = Math.max(1, Math.round(W / 3)), t2 = Math.max(t1 + 1, Math.round(2 * W / 3));
    var familles = {};
    types.forEach(function(t){
      familles[{ force: "force", gainage: "force", circuit: "circuit", hiit: "circuit", cardio: "cardio", frac: "cardio", endu: "cardio", longue: "cardio", mobilite: "mobilite" }[t]] = 1;
    });
    var MILIEU = {
      force: "Renfo : ajoute 1 série (ou 2 répétitions) à chaque exercice ; avec des charges, augmente un peu le poids dès que la dernière série devient facile.",
      circuit: "Circuits : ajoute 5 s d'effort et retire 5 s de récupération.",
      cardio: "Cardio : allonge d'environ 10 % ta durée, ou ajoute 1 répétition au fractionné.",
      mobilite: "Souplesse : tiens chaque posture 10 s de plus et va un peu plus loin, toujours sans douleur."
    };
    var FIN = {
      force: "Renfo : prends la version plus difficile des exercices (ou plus lourd) et réduis la récup de 15 s.",
      circuit: "Circuits : ajoute 1 tour.",
      cardio: "Cardio : garde la même durée mais un peu plus vite sur les parties rapides.",
      mobilite: "Souplesse : enchaîne les postures plus lentement, en respirant plus profondément."
    };
    var progression = [{ de: 1, a: t1, txt: "Prise en main : apprends bien chaque mouvement et garde toujours un peu de réserve. Si c'est trop facile, passe à la version plus dure." }];
    if(t2 > t1) progression.push({ de: t1 + 1, a: Math.max(t1 + 1, t2), txt: Object.keys(familles).map(function(f){ return MILIEU[f]; }).join(" ") });
    if(W > t2) progression.push({ de: t2 + 1, a: W, txt: Object.keys(familles).map(function(f){ return FIN[f]; }).join(" ") });
    if(W >= 8){
      for(var w = 4; w < W; w += 4) progression.push({ de: w, a: w, txt: "Semaine allégée : 1 série (ou 1 tour) de moins pour laisser le corps récupérer. C'est là qu'on progresse !" });
    }
    progression.push({ de: W, a: W, txt: "Semaine bilan : refais ta séance A comme en semaine 1 et note tes progrès dans les notes du programme." });
    progression.sort(function(a, b){ return a.de - b.de || b.a - a.a; });

    var materiel = Object.keys(mat).filter(function(m){ return m !== "aucun" && m !== "salle"; }).map(function(m){ return Q_MATERIEL[m]; }).filter(Boolean);
    if(g.lieu === "salle") materiel = ["Salle de sport"];
    if(O.type === "course") materiel = ["Chaussures de course"];
    else if(!materiel.length) materiel = ["Aucun (poids du corps)"];

    return {
      id: uid(), nom: O.court + " · " + W + " sem.", emoji: O.e, objectif: O.nom, but: g.but || "",
      niveau: nv, semaines: W, parSemaine: n, duree: D0, materiel: materiel, jours: (g.jours || []).slice().sort(),
      notes: O.type === "course" && appuisFragiles ? "⚠️ La course sollicite beaucoup les genoux et les chevilles : avec ta dispense, demande l'avis de ton médecin avant de commencer." : "",
      progression: progression, seances: seances, genere: true, params: g, graine: graine, origine: "generateur"
    };
  }

  /* ---------------- Récompenses ---------------- */
  function afficherRecompenses(st){
    var cur = semaineCourante();
    var h = '<div class="hero"><div class="gros">🔥 ' + st.actuelle + '</div><div class="sous">' + (st.actuelle > 1 ? "semaines complètes d'affilée" : "semaine complète d'affilée") + '</div>'
      + '<div class="mini"><span><b>' + st.serie + '</b>meilleure série</span><span><b>🃏 ' + st.jokersDispo + '</b>joker' + (st.jokersDispo > 1 ? "s" : "") + '</span><span><b>' + st.seances + '</b>séance' + (st.seances > 1 ? "s" : "") + '</span></div></div>';

    // Prochains paliers : le plus proche pour la série et pour le total de séances.
    var prochains = [];
    ["serie", "seances", "heures"].forEach(function(k){
      var r = RECOMPENSES.filter(function(x){ return x.cond.k === k && !D.debloques[x.id]; }).sort(function(a, b){ return a.cond.v - b.cond.v; })[0];
      if(!r) return;
      var actuel = k === "serie" ? st.actuelle : (k === "seances" ? st.seances : st.heures);
      var reste = r.cond.v - actuel, info = infoRecompense(r);
      var lib = k === "serie" ? "Encore " + pluriel(Math.max(1, Math.ceil(reste)), "semaine complète", "semaines complètes") + " d'affilée"
        : k === "seances" ? "Encore " + pluriel(Math.max(1, reste), "séance") : "Encore " + Math.max(1, Math.ceil(reste)) + " h de sport";
      prochains.push('<div class="palier"><span class="e">' + info.e + '</span><div class="c"><b>' + esc(info.titre) + '</b><small>' + lib + '</small>'
        + '<div class="barre"><i style="width:' + Math.round(100 * Math.min(1, Math.max(0, actuel) / r.cond.v)) + '%"></i></div></div></div>');
    });
    if(prochains.length) h += '<div class="titre-section">Prochains paliers</div><div class="card">' + prochains.join("") + '</div>';

    // Les 12 dernières semaines.
    var cases = "";
    for(var i = 11; i >= 0; i--){
      var wk = decalerSemaine(cur, -i), e = wk < D.reglages.debut ? "avant" : (st.etats[wk] || "incomplete");
      cases += '<i class="' + e + '" title="Semaine ' + libSemaine(wk) + '"></i>';
    }
    h += '<div class="titre-section">Mes 12 dernières semaines</div><div class="card"><div class="carte-sem">' + cases + '</div>'
      + '<div class="legende"><span style="--c:var(--ok)">complète</span><span style="--c:var(--or)">joker</span><span style="--c:var(--surface2)">pas complète</span></div>'
      + '<p class="petit muted" style="margin-bottom:0">🃏 Tu gagnes un <b>joker</b> toutes les ' + JOKER_TOUTES + ' semaines complètes. Pose-le sur une semaine off (vacances, maladie…) : ta série continue.</p></div>';

    h += '<div class="card"><div class="resume" style="justify-content:space-around;text-align:center">'
      + '<div><b style="font-size:1.4rem">' + st.completes + '</b><div class="petit muted">semaines<br>complètes</div></div>'
      + '<div><b style="font-size:1.4rem">' + (Math.round(st.heures * 10) / 10).toString().replace(".", ",") + ' h</b><div class="petit muted">de sport<br>au total</div></div>'
      + '<div><b style="font-size:1.4rem">' + st.types + '</b><div class="petit muted">activités<br>différentes</div></div></div></div>';

    // Trésors.
    var ONGLETS = { badge: "🏅 Badges", recette: "🥗 Recettes", exercice: "⚡ Exercices bonus", theme: "🎨 Thèmes" };
    h += '<div class="titre-section">Mes trésors</div><div class="onglets-tresor">' + Object.keys(ONGLETS).map(function(k){
      var total = RECOMPENSES.filter(function(r){ return r.type === k; }).length + (k === "theme" ? 1 : 0);
      var obtenus = RECOMPENSES.filter(function(r){ return r.type === k && D.debloques[r.id]; }).length + (k === "theme" ? 1 : 0);
      return '<button type="button" data-a="onglet-tresor" data-v="' + k + '" class="' + (ongletTresor === k ? "on" : "") + '">' + ONGLETS[k] + ' ' + obtenus + '/' + total + '</button>';
    }).join("") + '</div><div class="tresors">';
    if(ongletTresor === "theme"){
      h += '<div class="tresor' + (D.reglages.theme === "energie" ? " actif" : "") + '" data-a="choisir-theme" data-v="energie"><div class="e">' + THEMES.energie.e + '</div><b>Énergie</b>'
        + '<div class="apercu-theme"><i style="background:' + THEMES.energie.apercu[0] + '"></i><i style="background:' + THEMES.energie.apercu[1] + '"></i></div><small>' + (D.reglages.theme === "energie" ? "utilisé" : "toucher pour l'utiliser") + '</small></div>';
    }
    RECOMPENSES.filter(function(r){ return r.type === ongletTresor; }).forEach(function(r){
      var info = infoRecompense(r), ok = !!D.debloques[r.id], neuf = ok && !D.vus[r.id];
      var actif = r.type === "theme" && D.reglages.theme === r.theme;
      h += '<div class="tresor' + (ok ? "" : " verrou") + (actif ? " actif" : "") + '" data-a="tresor" data-id="' + r.id + '">' + (neuf ? '<span class="neuf">NOUVEAU</span>' : "")
        + '<div class="e">' + (ok ? info.e : "🔒") + '</div><b>' + esc(r.type === "theme" ? THEMES[r.theme].nom : info.titre) + '</b>'
        + (r.type === "theme" ? '<div class="apercu-theme"><i style="background:' + THEMES[r.theme].apercu[0] + '"></i><i style="background:' + THEMES[r.theme].apercu[1] + '"></i></div>' : "")
        + '<small>' + (ok ? (actif ? "utilisé" : "obtenu le " + dateCourte(D.debloques[r.id])) : esc(libCondition(r.cond))) + '</small></div>';
    });
    h += '</div>';
    $("#view-recompenses").innerHTML = h;
  }

  function ouvrirTresor(id){
    var r = RECOMPENSES.find(function(x){ return x.id === id; });
    if(!r) return;
    if(!D.debloques[r.id]){ toast("🔒 Se débloque avec : " + esc(libCondition(r.cond))); return; }
    if(!D.vus[r.id]){ D.vus[r.id] = 1; sauver(); majPointRecompenses(); }
    if(r.type === "theme"){ choisirTheme(r.theme); return; }
    var h;
    if(r.type === "badge"){
      h = '<div class="fete"><div class="gros-e">' + r.e + '</div><p>' + esc(r.texte) + '</p><p class="muted petit">Obtenu le ' + dateCourte(D.debloques[r.id]) + '</p></div>';
      ouvrirFeuille(r.titre, h);
    } else if(r.type === "recette"){
      var x = RECETTES[r.id];
      h = '<p class="muted" style="margin-top:-.4rem">' + x.e + " " + esc(x.temps) + " · " + esc(x.pour) + '</p>'
        + '<div class="bandeau">💡 ' + esc(x.pourquoi) + '</div>'
        + '<div class="card"><b>Ingrédients</b><ul class="simple">' + x.ingredients.map(function(i){ return "<li>" + esc(i) + "</li>"; }).join("") + '</ul></div>'
        + '<div class="card"><b>Préparation</b><ol class="simple">' + x.etapes.map(function(i){ return "<li>" + esc(i) + "</li>"; }).join("") + '</ol></div>';
      ouvrirFeuille(x.titre, h);
    } else {
      var b = BONUS[r.id];
      h = '<p class="muted" style="margin-top:-.4rem">' + b.e + " Environ " + b.duree + " min</p>"
        + (zonesBonus(b).length ? '<div class="bandeau alerte">⚠️ Déconseillé avec ta dispense (' + esc(zonesBonus(b).join(", ")) + ').</div>' : "")
        + '<p>' + esc(b.intro) + '</p><div class="card"><ol class="simple">' + b.etapes.map(function(i){ return "<li>" + esc(i) + "</li>"; }).join("") + '</ol></div>'
        + '<div class="bandeau">💡 ' + esc(b.astuce) + '</div>'
        + '<button type="button" class="btn principal plein" data-a="bonus-aujourdhui" data-id="' + r.id + '">📅 Prévoir aujourd\'hui</button>';
      ouvrirFeuille(b.titre, h);
    }
    toutAfficher();
  }

  function zonesBonus(b){
    return (b.eviter || []).filter(function(z){ return dispense().zones.indexOf(z) >= 0; }).map(function(z){ return ZONES_SENSIBLES[z].nom.toLowerCase(); });
  }

  function choisirTheme(cle){
    if(!themeDebloque(cle)) return;
    D.reglages.theme = cle; sauver(); appliquerTheme(); toutAfficher();
    toast("Thème « " + esc(THEMES[cle].nom) + " » appliqué " + THEMES[cle].e);
  }

  /* ---------------- Écran « Ma dispense » ---------------- */
  var CATEGORIES = { force: "Renforcement", gainage: "Gainage / abdos", cardio: "Cardio", mobilite: "Souplesse / étirements" };
  function ouvrirDispense(){
    var d = dispense();
    var h = '<p class="petit muted" style="margin-top:-.4rem">Une dispense, une douleur, une blessure en cours ? Indique ce que tu ne peux pas faire : '
      + 'les programmes générés l\'évitent, et les exercices concernés sont signalés ⚠️ partout dans l\'appli.</p>'
      + '<div class="q">Zones à ménager</div><div class="choix" data-groupe="dz">' + Object.keys(ZONES_SENSIBLES).map(function(z){
        return '<button type="button" data-a="basculer" data-v="' + z + '" class="' + (d.zones.indexOf(z) >= 0 ? "on" : "") + '">' + ZONES_SENSIBLES[z].e + " " + esc(ZONES_SENSIBLES[z].nom) + '</button>';
      }).join("") + '</div>'
      + '<div class="choix" data-groupe="ds"><button type="button" data-a="basculer" data-v="1" class="' + (d.sansSaut ? "on" : "") + '">🤫 Pas de saut du tout</button></div>'
      + '<div class="q">Exercices précis que je ne peux pas faire <small>(en plus de ceux des zones cochées)</small></div>';
    Object.keys(CATEGORIES).forEach(function(c){
      h += '<div class="petit muted" style="margin:.2rem 0 .3rem">' + CATEGORIES[c] + '</div><div class="choix" data-groupe="dx">'
        + EXERCICES.filter(function(e){ return e.c === c; }).map(function(e){
          return '<button type="button" data-a="basculer" data-v="' + esc(e.n) + '" class="' + (d.exos.indexOf(e.n) >= 0 ? "on" : "") + '">' + esc(e.n) + '</button>';
        }).join("") + '</div>';
    });
    h += '<label class="champ"><span>Jusqu\'au <span class="muted">(facultatif : l\'appli te demandera ensuite si c\'est fini)</span></span><input type="date" id="dp-fin" value="' + esc(d.jusquau) + '"></label>'
      + '<label class="champ"><span>Note <span class="muted">(facultatif)</span></span><textarea id="dp-note" placeholder="Ex. : entorse cheville droite, kiné le mardi">' + esc(d.note) + '</textarea></label>'
      + '<button type="button" class="btn principal plein" data-a="enreg-dispense">Enregistrer</button>'
      + (dispenseActive() ? '<button type="button" class="btn danger plein" style="margin-top:.5rem" data-a="retirer-dispense">Retirer ma dispense</button>' : "")
      + '<div class="note-sante">Ces réglages aident à éviter les mouvements gênants, ils ne remplacent pas l\'avis de ton médecin ou de ton kiné.</div>';
    ouvrirFeuille("🩹 Ma dispense", h);
  }

  function apresChangementDispense(message){
    sauver(); preparerModeles(); fermerFeuille(); toutAfficher();
    var concernes = D.programmes.filter(function(p){ return conflits(p) > 0; });
    if(concernes.length){
      toast(message + " · " + pluriel(concernes.length, "programme à adapter", "programmes à adapter"), [{ lib: "Adapter", fn: function(){
        var bilan = { remplaces: 0, restants: 0 };
        concernes.forEach(function(p){ var b = adapterProgramme(p); bilan.remplaces += b.remplaces; bilan.restants += b.restants; });
        sauver(); toutAfficher();
        toast(pluriel(bilan.remplaces, "exercice remplacé", "exercices remplacés") + (bilan.restants ? " · " + bilan.restants + " à revoir à la main" : " ✅"));
      } }], 8000);
    } else toast(message);
  }

  /* Remplace chaque exercice déconseillé par le plus proche qui convient :
     même catégorie, mêmes zones si possible, matériel disponible, pas déjà
     dans la séance. Les exercices inconnus (notés à la main) restent signalés. */
  function adapterProgramme(p){
    var mat = { aucun: 1 }, g = p.params || {};
    (g.materiel || []).forEach(function(m){ mat[m] = 1; });
    if(g.lieu === "salle") ["salle", "halteres", "kettlebell", "banc", "traction", "elastique", "velo", "corde"].forEach(function(m){ mat[m] = 1; });
    var remplaces = 0;
    (p.seances || []).forEach(function(s){
      var dans = {};
      s.exos.forEach(function(x){ dans[x.nom] = 1; });
      s.exos.forEach(function(x){
        var ancien = EXO_PAR_NOM[x.nom];
        if(!ancien || !raisonDispense(x.nom)) return;
        var choix = null;
        if(ancien.echauf){
          choix = ECHAUFFEMENT.filter(function(c){ return !dans[c.n] && !raisonDispense(c.n); })[0];
        } else {
          if(!p.params) ancien.m.forEach(function(m){ mat[m] = 1; });
          choix = EXERCICES.filter(function(c){
            return c.c === ancien.c && !dans[c.n] && !raisonDispense(c.n) && c.nv <= Math.max(ancien.nv, p.niveau || 1) && c.m.some(function(m){ return mat[m]; });
          }).map(function(c){
            return { e: c, s: c.z.filter(function(z){ return ancien.z.indexOf(z) >= 0; }).length * 2 + ((!!c.iso) === (!!ancien.iso) ? 1.5 : 0) + (c.nv === ancien.nv ? .5 : 0) };
          }).sort(function(a, b){ return b.s - a.s; }).map(function(o){ return o.e; })[0];
        }
        if(!choix) return;
        var dose = (x.dose || "").replace(/ par côté$/, "").replace(/ \(alterne\)$/, "");
        if(!ancien.echauf){
          var series = dose.match(/^(\d+) ×/);
          if(series && (!!choix.iso) !== (!!ancien.iso)) dose = series[1] + " × " + (choix.iso ? "30 s" : "10 à 12");
          if(choix.uni) dose += / ×/.test(dose) ? " par côté" : " (alterne)";
        }
        delete dans[x.nom];
        dans[choix.n] = 1;
        x.nom = choix.n; x.cons = choix.t; x.dose = dose;
        remplaces++;
      });
    });
    return { remplaces: remplaces, restants: conflits(p) };
  }

  /* ---------------- Réglages et sauvegarde ---------------- */
  function ouvrirReglages(){
    var r = D.reglages, info = lire(K_SAUVEGARDE, {});
    var themes = Object.keys(THEMES).filter(themeDebloque);
    var h = '<label class="champ"><span>Ton prénom (facultatif)</span><input type="text" id="rg-prenom" maxlength="30" value="' + esc(r.prenom) + '"></label>'
      + '<label class="champ"><span>Objectif d\'une semaine où rien n\'est planifié</span><select id="rg-objectif">'
      + [1, 2, 3, 4, 5, 6, 7].map(function(n){ return '<option value="' + n + '"' + (Number(r.objectifDefaut) === n ? " selected" : "") + '>' + pluriel(n, "séance") + '</option>'; }).join("") + '</select></label>'
      + '<div class="q">Affichage</div><div class="choix" data-groupe="mode">'
      + [["auto", "📱 Comme le téléphone"], ["clair", "☀️ Clair"], ["sombre", "🌙 Sombre"]].map(function(m){
        return '<button type="button" data-a="choix-unique" data-v="' + m[0] + '" class="' + (r.mode === m[0] ? "on" : "") + '">' + m[1] + '</button>';
      }).join("") + '</div>'
      + '<div class="q">Thème <small>(' + themes.length + ' sur ' + Object.keys(THEMES).length + ' débloqués)</small></div><div class="choix" data-groupe="theme">'
      + themes.map(function(k){ return '<button type="button" data-a="choix-unique" data-v="' + k + '" class="' + (r.theme === k ? "on" : "") + '">' + THEMES[k].e + " " + esc(THEMES[k].nom) + '</button>'; }).join("") + '</div>'
      + '<label class="champ"><span>Me rappeler de sauvegarder</span><select id="rg-rappel">'
      + [[0, "Jamais"], [7, "Toutes les semaines"], [14, "Toutes les 2 semaines"], [30, "Tous les mois"]].map(function(o){
        return '<option value="' + o[0] + '"' + (Number(r.rappelJours) === o[0] ? " selected" : "") + '>' + o[1] + '</option>';
      }).join("") + '</select></label>'
      + '<button type="button" class="btn principal plein" data-a="enreg-reglages">Enregistrer les réglages</button>'
      + '<button type="button" class="btn doux plein" style="margin-top:.5rem" data-a="ouvrir-dispense">🩹 Ma dispense / contre-indications' + (dispenseActive() ? " (" + esc(libDispense()) + ")" : "") + '</button>'
      + '<div class="titre-section">Sauvegarde</div>'
      + '<div class="card"><p class="petit" style="margin-top:0">Tes données restent <b>uniquement sur ce téléphone</b>. Si tu changes de téléphone ou vides le navigateur, elles sont perdues : '
      + 'fais une sauvegarde de temps en temps (un fichier que tu peux garder dans tes fichiers ou t\'envoyer par mail).</p>'
      + '<p class="petit muted">' + pluriel(D.faits.length, "séance cochée", "séances cochées") + " · " + pluriel(D.programmes.length, "programme") + ' · dernière sauvegarde : ' + (info.le ? dateCourte(info.le) : "jamais") + '</p>'
      + '<button type="button" class="btn principal plein" data-a="exporter">💾 Sauvegarder (fichier)</button>'
      + '<button type="button" class="btn plein" style="margin-top:.5rem" data-a="importer">📂 Restaurer une sauvegarde</button>'
      + '<input type="file" id="fichier-import" accept=".json,application/json" hidden></div>'
      + '<div class="titre-section">Zone sensible</div>'
      + '<button type="button" class="btn danger plein" data-a="tout-effacer">Tout effacer sur ce téléphone</button>'
      + '<p class="petit muted" style="text-align:center;margin-top:1rem">Élan · version ' + VERSION + '</p>';
    ouvrirFeuille("Réglages", h, function(el){
      $("#fichier-import", el).addEventListener("change", function(){
        var f = this.files && this.files[0];
        if(!f) return;
        var lecteur = new FileReader();
        lecteur.onload = function(){ restaurer(String(lecteur.result || "")); };
        lecteur.readAsText(f);
      });
    });
  }

  function empreinte(){
    var s = JSON.stringify({ t: D.semaineType, s: D.semaines, f: D.faits, p: D.programmes, j: D.jokers });
    var h = 5381;
    for(var i = 0; i < s.length; i++){ h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; }
    return String(h);
  }
  function exporter(){
    var contenu = JSON.stringify({ format: "elan", version: VERSION, le: new Date().toISOString(), donnees: D }, null, 1);
    var blob = new Blob([contenu], { type: "application/json" });
    var url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = "elan-sauvegarde-" + aujourdhui() + ".json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 4000);
    ecrire(K_SAUVEGARDE, { le: aujourdhui(), empreinte: empreinte(), reporteJusquau: "" });
    toast("Sauvegarde créée 💾");
    afficherRappel();
    verifierRecompenses();
  }
  function restaurer(texte){
    var o;
    try { o = JSON.parse(texte); } catch(e){ toast("Ce fichier n'est pas lisible."); return; }
    if(!o || o.format !== "elan" || !o.donnees){ toast("Ce fichier n'est pas une sauvegarde d'Élan."); return; }
    var nb = (o.donnees.faits || []).length;
    if(!confirm("Remplacer les données de ce téléphone par cette sauvegarde (" + pluriel(nb, "séance") + ") ?")) return;
    D = normaliser(o.donnees);
    sauver();
    ecrire(K_SAUVEGARDE, { le: aujourdhui(), empreinte: empreinte(), reporteJusquau: "" });
    figerSemainesPassees(); appliquerTheme();
    cacherFeuille(); semaineVue = semaineCourante(); planVue = semaineVue;
    toutAfficher(); toast("Sauvegarde restaurée ✅");
    verifierRecompenses(false);
  }

  function afficherRappel(){
    var el = $("#rappel");
    if(!stockageOk){
      el.hidden = false; el.className = "bandeau alerte";
      el.innerHTML = "<b>Attention :</b> ce navigateur refuse d'enregistrer les données (navigation privée ?). Ce que tu coches sera perdu en fermant l'onglet.";
      return;
    }
    el.className = "bandeau";
    var freq = Number(D.reglages.rappelJours) || 0, info = lire(K_SAUVEGARDE, {});
    if(!freq || D.faits.length < 3){ el.hidden = true; return; }
    if(info.reporteJusquau && info.reporteJusquau > aujourdhui()){ el.hidden = true; return; }
    if(info.empreinte === empreinte()){ el.hidden = true; return; }
    if(info.le && joursDepuis(info.le) < freq){ el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = "<b>Pense à sauvegarder 💾</b> Tes séances ne vivent que sur ce téléphone : "
      + (info.le ? "dernière sauvegarde le " + dateCourte(info.le) + "." : "aucune sauvegarde pour l'instant.")
      + '<div class="actions"><button type="button" class="btn principal" data-a="exporter">Sauvegarder</button>'
      + '<button type="button" class="btn" data-a="rappel-plus-tard">Plus tard</button></div>';
  }

  /* ================================================================
     Actions (un seul écouteur pour toute l'appli)
     ================================================================ */
  document.addEventListener("click", function(e){
    var t = e.target.closest("[data-a]");
    if(!t) return;
    var a = t.dataset.a, id = t.dataset.id, el = $("#feuille");
    if(t.tagName === "A") e.preventDefault();

    switch(a){
      case "fermer": fermerFeuille(); break;

      // Choix dans un groupe (une seule valeur / plusieurs).
      case "choix-unique": case "choix-activite": case "choix-duree": case "choix-ressenti":
        var groupe = t.closest("[data-groupe]");
        $$("button", groupe).forEach(function(b){ b.classList.toggle("on", b === t); });
        if(a === "choix-duree"){ var cd = $("#champ-duree"); if(cd) cd.value = t.dataset.v; }
        break;
      case "basculer": t.classList.toggle("on"); break;

      // Ma semaine
      case "sem-nav":
        semaineVue = t.dataset.d === "0" ? semaineCourante() : decalerSemaine(semaineVue, Number(t.dataset.d));
        toutAfficher(); break;
      case "cocher": cocher(semaineVue, id); break;
      case "detail-creneau": ouvrirDetailCreneau(semaineVue, id); break;
      case "cocher-detail": fermerFeuille(); cocher(el.dataset.wk || semaineVue, id); break;
      case "decocher-detail": fermerFeuille(); cocher(el.dataset.wk || semaineVue, id); break;
      case "enreg-detail":
        var fd = D.faits.find(function(x){ return x.id === id; });
        if(fd){ var rv = valeurGroupe(el, "ressenti"); fd.ressenti = rv ? Number(rv) : null; fd.note = $("#note-fait", el).value; sauver(); }
        fermerFeuille(); toutAfficher(); break;
      case "modifier-dans-planning":
        var wkp = el.dataset.wk || semaineVue;
        fermerFeuille(); planMode = "semaine"; planVue = wkp; afficherVue("planning");
        setTimeout(function(){ ouvrirEditeurCreneau({ type: false, wk: wkp, id: id }); }, 60);
        break;
      case "ajout-fait": ouvrirFormFait(semaineVue, null); break;
      case "modifier-fait": ouvrirFormFait(semaineVue, id); break;
      case "enreg-fait":
        var wkf = el.dataset.wk, existant = id ? D.faits.find(function(x){ return x.id === id; }) : null;
        var dureeF = Number($("#champ-duree", el).value) || Number(valeurGroupe(el, "duree")) || 0;
        var rf = valeurGroupe(el, "ressenti");
        var donneesF = { date: $("#ff-date", el).value, activite: valeurGroupe(el, "activite") || "autre", titre: $("#ff-titre", el).value.trim(),
          duree: dureeF, ressenti: rf ? Number(rf) : null, note: $("#ff-note", el).value };
        if(existant) Object.assign(existant, donneesF);
        else D.faits.push(Object.assign({ id: uid(), sem: wkf, slot: null, le: Date.now() }, donneesF));
        sauver(); fermerFeuille(); toutAfficher();
        if(!existant){ toast("Séance ajoutée 💪"); verifierRecompenses(); }
        break;
      case "suppr-fait": case "retirer-fait":
        var fs = D.faits.find(function(x){ return x.id === id; });
        if(!fs) break;
        D.faits = D.faits.filter(function(x){ return x !== fs; });
        sauver(); if(a === "suppr-fait") fermerFeuille(); toutAfficher();
        toast("Séance retirée", [{ lib: "Annuler", fn: function(){ D.faits.push(fs); sauver(); toutAfficher(); } }]);
        break;
      case "poser-joker":
        if(calculerStats().jokersDispo > 0 && D.jokers.indexOf(semaineVue) < 0){
          D.jokers.push(semaineVue); sauver(); toutAfficher(); toast("Joker posé 🃏 ta série est protégée.");
        }
        break;
      case "retirer-joker": D.jokers = D.jokers.filter(function(w){ return w !== semaineVue; }); sauver(); toutAfficher(); break;
      case "aller-planning-type": planMode = "type"; afficherVue("planning"); break;

      // Planning
      case "plan-mode": planMode = t.dataset.v; toutAfficher(); break;
      case "plan-nav":
        planVue = t.dataset.d === "0" ? semaineCourante() : decalerSemaine(planVue, Number(t.dataset.d));
        toutAfficher(); break;
      case "ajouter-creneau": ouvrirEditeurCreneau({ type: planMode === "type", wk: planVue, j: Number(t.dataset.j) }); break;
      case "editer-creneau": ouvrirEditeurCreneau({ type: planMode === "type", wk: planVue, id: id }); break;
      case "enreg-creneau": enregistrerCreneau(el); break;
      case "suppr-creneau":
        var ctx = JSON.parse(el.dataset.ctx);
        if(ctx.type) D.semaineType = D.semaineType.filter(function(s){ return s.id !== ctx.id; });
        else D.semaines[ctx.wk] = planModifiable(ctx.wk).filter(function(s){ return s.id !== ctx.id; });
        sauver(); fermerFeuille(); toutAfficher(); break;
      case "revenir-type":
        if(confirm("Annuler les modifications de cette semaine et reprendre ta semaine type ?")){ delete D.semaines[planVue]; sauver(); toutAfficher(); }
        break;
      case "enreg-comme-type":
        if(confirm("Ce planning deviendra ta semaine type, répétée chaque semaine. On continue ?")){
          D.semaineType = cloner(D.semaines[planVue] || planDe(planVue));
          if(planVue >= semaineCourante()) delete D.semaines[planVue];
          sauver(); toutAfficher(); toast("Semaine type mise à jour ⭐");
        }
        break;
      case "vider-type":
        if(confirm("Retirer toutes les séances de ta semaine type ?")){ D.semaineType = []; sauver(); toutAfficher(); }
        break;
      case "aller-programmes": afficherVue("programmes"); break;

      // Programmes
      case "generateur": ouvrirGenerateur(); break;
      case "nouveau-programme": ouvrirEditeurProgramme(null); break;
      case "ouvrir-programme": var po = progDe(id); if(po) ouvrirProgramme(po, false); break;
      case "ouvrir-modele": var mo = MODELES.find(function(m){ return m.id === id; }); if(mo) ouvrirProgramme(mo, true); break;
      case "garder-modele":
        var mg = MODELES.find(function(m){ return m.id === id; });
        if(!mg) break;
        var copie = cloner(mg); copie.id = uid(); copie.cree = aujourdhui(); copie.origine = "modele";
        D.programmes.push(copie); sauver(); toutAfficher();
        ouvrirVersSemaineType(copie);
        break;
      case "prog-vers-type": var pv = progDe(id); if(pv) ouvrirVersSemaineType(pv); break;
      case "valider-vers-type": var pt = progDe(id); if(pt) validerVersType(el, pt); break;
      case "editer-programme": var pe = progDe(id); if(pe) ouvrirEditeurProgramme(pe); break;
      case "dupliquer-programme":
        var pd = progDe(id);
        if(!pd) break;
        var dup = cloner(pd); dup.id = uid(); dup.nom = pd.nom + " (copie)"; dup.debut = null; dup.origine = "main";
        D.programmes.push(dup); sauver(); fermerFeuille(); toutAfficher(); toast("Programme dupliqué ⧉");
        break;
      case "regenerer": var pr = progDe(id); if(pr) ouvrirGenerateur(pr.params); break;
      case "suppr-programme":
        if(confirm("Supprimer ce programme ? Les séances déjà prévues dans ton planning restent.")){
          D.programmes = D.programmes.filter(function(p){ return p.id !== id; });
          sauver(); fermerFeuille(); toutAfficher();
        }
        break;
      case "prog-emoji": brouillon.emoji = t.dataset.v; rendreEditeurProgramme(); break;
      case "ep-ajout-exo": brouillon.seances[Number(t.dataset.s)].exos.push({ nom: "", dose: "" }); rendreEditeurProgramme(); break;
      case "ep-suppr-exo": brouillon.seances[Number(t.dataset.s)].exos.splice(Number(t.dataset.x), 1); rendreEditeurProgramme(); break;
      case "ep-ajout-seance":
        brouillon.seances.push({ titre: "Séance " + String.fromCharCode(65 + brouillon.seances.length), activite: "renfo", duree: 30, exos: [{ nom: "", dose: "" }] });
        rendreEditeurProgramme(); break;
      case "ep-suppr-seance": brouillon.seances.splice(Number(t.dataset.s), 1); rendreEditeurProgramme(); break;
      case "ep-enreg": enregistrerBrouillon(); break;

      // Générateur
      case "g-choix": choixGenerateur(t); break;
      case "g-suiv": etapeG = Math.min(5, etapeG + 1); rendreGenerateur(); break;
      case "g-prec": etapeG = Math.max(1, etapeG - 1); rendreGenerateur(); break;
      case "g-variante": apercuG = null; rendreGenerateur(); break;
      case "g-garder":
        D.gen = cloner(G);
        D.programmes.push(apercuG); sauver();
        var garde = apercuG; apercuG = null;
        toutAfficher();
        ouvrirVersSemaineType(garde);
        verifierRecompenses();
        break;

      // Récompenses
      case "voir-recompenses": fermerFeuille(); afficherVue("recompenses"); break;
      case "onglet-tresor": ongletTresor = t.dataset.v; toutAfficher(); break;
      case "tresor": ouvrirTresor(id); break;
      case "choisir-theme": choisirTheme(t.dataset.v); break;
      case "bonus-aujourdhui":
        var bo = BONUS[id], cur = semaineCourante();
        planModifiable(cur).push({ id: uid(), j: indexJour(aujourdhui()), activite: bo.activite, titre: bo.titre, duree: bo.duree, prog: null, seance: null });
        sauver(); fermerFeuille(); semaineVue = cur; afficherVue("semaine"); toast("Ajouté à aujourd'hui " + bo.e);
        break;

      // Réglages
      case "enreg-reglages":
        D.reglages.prenom = $("#rg-prenom", el).value.trim();
        D.reglages.objectifDefaut = Number($("#rg-objectif", el).value) || 2;
        D.reglages.mode = valeurGroupe(el, "mode") || "auto";
        D.reglages.theme = valeurGroupe(el, "theme") || D.reglages.theme;
        D.reglages.rappelJours = Number($("#rg-rappel", el).value) || 0;
        sauver(); appliquerTheme(); fermerFeuille(); toutAfficher(); toast("Réglages enregistrés ✅");
        break;
      case "exporter": exporter(); break;
      case "ouvrir-dispense": ouvrirDispense(); break;
      case "enreg-dispense":
        D.reglages.dispense = {
          zones: $$('[data-groupe="dz"] .on', el).map(function(b){ return b.dataset.v; }),
          sansSaut: !!$('[data-groupe="ds"] .on', el),
          exos: $$('[data-groupe="dx"] .on', el).map(function(b){ return b.dataset.v; }),
          jusquau: $("#dp-fin", el).value, note: $("#dp-note", el).value.trim()
        };
        apresChangementDispense(dispenseActive() ? "🩹 Dispense enregistrée" : "Dispense retirée");
        break;
      case "retirer-dispense":
        D.reglages.dispense = dispenseVide();
        apresChangementDispense("Dispense retirée 💪");
        break;
      case "adapter-programme":
        var pa = progDe(id);
        if(!pa) break;
        var bil = adapterProgramme(pa);
        sauver(); toutAfficher(); ouvrirProgramme(pa, false);
        toast(pluriel(bil.remplaces, "exercice remplacé", "exercices remplacés") + (bil.restants ? " · " + bil.restants + " à revoir à la main" : " ✅"));
        break;
      case "importer": $("#fichier-import").click(); break;
      case "rappel-plus-tard":
        var inf = lire(K_SAUVEGARDE, {}); inf.reporteJusquau = iso(ajouterJours(new Date(), 2));
        ecrire(K_SAUVEGARDE, inf); afficherRappel(); break;
      case "tout-effacer":
        if(confirm("Effacer TOUTES tes données sur ce téléphone (séances, programmes, récompenses) ?")
          && confirm("Vraiment ? Sans sauvegarde, c'est définitif.")){
          D = donneesVides(); sauver(); localStorage.removeItem(K_SAUVEGARDE);
          appliquerTheme(); cacherFeuille(); semaineVue = semaineCourante(); planVue = semaineVue; afficherVue("semaine");
        }
        break;
    }
  });

  $("#feuille").addEventListener("input", majBrouillon);
  $("#feuille").addEventListener("change", majBrouillon);
  $$(".tab").forEach(function(t){ t.addEventListener("click", function(){ afficherVue(t.dataset.view); }); });
  $("#btn-reglages").addEventListener("click", ouvrirReglages);
  $("#btn-flamme").addEventListener("click", function(){ afficherVue("recompenses"); });

  // Retour sur l'appli (le lendemain, la semaine suivante…) : on remet à jour.
  var derniereSemaine = semaineCourante();
  document.addEventListener("visibilitychange", function(){
    if(document.visibilityState !== "visible") return;
    var cur = semaineCourante();
    if(cur !== derniereSemaine){
      if(semaineVue === derniereSemaine) semaineVue = cur;
      if(planVue === derniereSemaine) planVue = cur;
      derniereSemaine = cur;
    }
    figerSemainesPassees(); toutAfficher(); verifierRecompenses();
  });

  /* ---------------- Démarrage ---------------- */
  if(!lire(K, null)) sauver();
  figerSemainesPassees();
  preparerModeles();
  appliquerTheme();
  if(["semaine", "planning", "programmes", "recompenses"].indexOf(vue) < 0) vue = "semaine";
  afficherVue(vue);
  verifierRecompenses();

  // Accès pour les tests depuis la console (aucun effet sur l'usage normal).
  window.__elan = { donnees: function(){ return D; }, generer: genererProgramme, stats: calculerStats };
})();
