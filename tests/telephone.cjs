// Vérifie le site EN LIGNE (ou une adresse donnée) dans Chrome au format téléphone :
//  - aucune erreur dans la console ;
//  - chaque écran de dictée tient sans défiler, clavier compris, aux 7 tailles de téléphone
//    (phrase la plus longue, relecture, correction avec explications, réécriture, dictée à trous, préparation) ;
//  - la voix dicte la phrase entière puis le premier groupe de mots (voix simulée : Chrome sans voix française) ;
//  - des dictées du jour complètes jouées (via window.__plumes) ;
//  - Leitner : une phrase ratée revient le lendemain, puis 3 jours après une réussite ;
//  - une phrase fausse donne les bons types d'erreur ;
//  - un texte ajouté par le parent, avec des trous, se joue ;
//  - l'appli marche hors ligne après une première visite ;
//  - l'appli apparaît sur « Mes applis ».
// Usage : node tests/telephone.cjs [url]   (captures dans captures/)
const { chromium } = require('playwright');
const fs = require('fs');

const URL = process.argv[2] || 'https://lechampdelaurore-boop.github.io/a-vos-plumes/';
const LIVE = !process.argv[2];
const SIZES = [[320, 568], [360, 640], [375, 667], [390, 664], [390, 844], [412, 780], [430, 932]];
const expectedCache = (fs.readFileSync(__dirname + '/../sw.js', 'utf8').match(/a-vos-plumes-v\d+/) || [])[0];
const prefs = dicte => JSON.stringify({ son: false, anim: false, vibre: false, dicte });

const lignes = [];
let echec = false;
function note(ok, texte) { if (!ok) echec = true; lignes.push(`| ${ok ? '✅' : '❌'} | ${texte} |`); console.log((ok ? 'OK   ' : 'ÉCHEC ') + texte); }

// Voix française simulée : on garde ce qui est dit dans window.__dits
function fausseVoix() {
  window.__dits = [];
  const voix = { lang: 'fr-FR', name: 'Voix de test', localService: true, default: true, voiceURI: 'test' };
  const synth = {
    getVoices: () => [voix], speaking: false, pending: false, paused: false,
    speak(u) { window.__dits.push(u.text); setTimeout(() => u.onend && u.onend(), 30); },
    cancel() {}, pause() {}, resume() {}, addEventListener() {}, removeEventListener() {}
  };
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };
}

async function nouvellePage(browser, w, h, erreurs, o = {}) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  page.on('pageerror', e => erreurs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()); });
  if (o.voix) await page.addInitScript(fausseVoix);
  await page.addInitScript(([p, ecole]) => {
    if (!localStorage.getItem('marc.dictees.prefs')) localStorage.setItem('marc.dictees.prefs', p);
    if (!localStorage.getItem('marc.dictees.ecole')) localStorage.setItem('marc.dictees.ecole', ecole);
  }, [prefs(o.dicte || 'lire'), JSON.stringify({ 5: 'rouge', 7: 'violet', 10: 'violet' })]);
  await page.goto(URL + '?nocache=' + Date.now());
  await page.waitForFunction(() => window.__plumes);
  return page;
}
const etat = page => page.evaluate(() => __plumes.etat());
// Combien l'écran déborde : la page entière, puis la carte de la dictée
async function debord(page) {
  return page.evaluate(() => { const z = document.querySelector('#jZone'); return Math.max(document.documentElement.scrollHeight - innerHeight, z && z.offsetParent ? z.scrollHeight - z.clientHeight - 2 : 0); });
}
// Joue jusqu'à la fin de la série en cours ; faux(e) dit si on se trompe à cette phrase
async function jouerSerie(page, faux = () => false) {
  for (let n = 0; n < 400; n++) {
    const e = await etat(page);
    if (e.vue !== 'vJeu') return e;
    if (e.q && (e.q.phase === 'ecrire') && faux(e)) await page.evaluate(() => __plumes.ecrireFaux());
    else await page.evaluate(() => __plumes.juste());
  }
  return etat(page);
}

(async () => {
  fs.mkdirSync('captures', { recursive: true });
  if (LIVE) {
    for (let i = 0; ; i++) {
      const live = await fetch(URL + 'sw.js?nocache=' + Date.now()).then(r => r.text()).catch(() => '');
      if (live.includes(expectedCache)) { console.log('Version en ligne : ' + expectedCache); break; }
      if (i >= 18) { console.log('Version en ligne différente de ' + expectedCache + ' après 3 min'); process.exit(1); }
      await new Promise(r => setTimeout(r, 10000));
    }
  }
  const browser = await chromium.launch();

  // 1. Les 7 tailles : aucun écran de dictée ne défile
  for (const [w, h] of SIZES) {
    for (const dicte of (w === 320 || w === 390 && h === 844) ? ['lire', 'voix', 'adulte'] : ['lire']) {
      const erreurs = [];
      const page = await nouvellePage(browser, w, h, erreurs, { dicte, voix: dicte === 'voix' });
      let pire = 0, pireEcran = '';
      const cap = (w === 320 || (w === 390 && h === 844)) && dicte === 'lire';
      const mesure = async (nom) => {
        await page.waitForTimeout(40);
        const d = await debord(page); if (d > pire) { pire = d; pireEcran = nom; }
        if (cap) await page.screenshot({ path: `captures/${w}x${h}-${nom.replace(/[^a-z0-9]+/gi, '-')}.png` });
      };
      // La phrase la plus longue (95 caractères, 11 pièges)
      await page.evaluate(() => __plumes.lancer('e7', 'entiere', 'longue', 1));
      await mesure('ecrire');
      const att = (await etat(page)).q.attendu;
      await page.evaluate(t => __plumes.taper(t), att.slice(0, -4).toLowerCase());
      await mesure('ecrire plein');
      await page.evaluate(() => __plumes.ecrireFaux());
      for (let k = 0; k < 3 && (await etat(page)).q.phase === 'relire'; k++) { await mesure('relire ' + k); await page.evaluate(() => __plumes.juste()); }
      await mesure('correction');
      await page.evaluate(() => __plumes.juste());
      for (let k = 0; k < 6 && (await etat(page)).q && (await etat(page)).q.phase === 'reec'; k++) { await mesure('reecrire ' + k); await page.evaluate(() => __plumes.juste()); }
      // Dictée à trous (groupe rouge)
      await page.evaluate(() => __plumes.lancer('e5', 'trous', 'longue', 1));
      await mesure('trous');
      await page.evaluate(() => __plumes.ecrireFaux());
      await mesure('trous relire');
      for (let k = 0; k < 3 && (await etat(page)).q.phase === 'relire'; k++) await page.evaluate(() => __plumes.juste());
      await mesure('trous correction');
      // Préparation d'un texte de niveau 4 : le texte peut défiler dans sa carte, les pièges non
      await page.evaluate(() => { localStorage.removeItem('marc.dictees.journal'); });
      await page.evaluate(() => __plumes.lancer('n4-6', 'entiere', 0));
      if (cap) await page.screenshot({ path: `captures/${w}x${h}-prep-texte.png` });
      await page.evaluate(() => __plumes.juste());
      await page.evaluate(() => __plumes.prepFaux()); await page.evaluate(() => __plumes.prepFaux());
      await mesure('prep astuce');
      note(pire <= 0 && !erreurs.length, `${w}×${h} (${dicte}) : ${pire > 0 ? 'dépasse de ' + pire + ' px (' + pireEcran + ')' : 'tout tient sans défiler'}${erreurs.length ? ', erreurs : ' + erreurs.join(' / ') : ''}`);
      await page.close();
    }
  }

  // 2. La voix dicte la phrase entière, puis le premier groupe de mots
  {
    const erreurs = [];
    const page = await nouvellePage(browser, 390, 844, erreurs, { dicte: 'voix', voix: true });
    await page.evaluate(() => __plumes.lancer('n2-1', 'entiere', 1, 1));
    await page.waitForTimeout(1200);
    const e = await etat(page), dits = await page.evaluate(() => window.__dits);
    note(e.dicteur === 'voix' && dits[0] === e.q.attendu && dits.length >= 2 && e.q.attendu.startsWith(dits[1].replace(/[,.]$/, '')), `Voix : « ${dits[0]} » puis « ${dits[1]} »`);
    note(!erreurs.length, 'Console sans erreur (voix)' + (erreurs.length ? ' : ' + erreurs.join(' / ') : ''));
    await page.close();
  }

  // 3. Dictées du jour complètes + Leitner
  {
    const erreurs = [];
    const page = await nouvellePage(browser, 390, 844, erreurs);
    const d = n => { const x = new Date(); x.setDate(x.getDate() + n); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
    const plan0 = await page.evaluate(() => __plumes.plan());
    await page.evaluate(() => __plumes.jour());
    // on rate la première phrase du texte
    let premiere = true;
    const fin0 = await jouerSerie(page, e => { if (premiere && !e.q.rev) { premiere = false; return true; } return false; });
    await page.screenshot({ path: 'captures/fin-de-dictee.png' });
    const id0 = plan0.tid + '#' + plan0.debut;
    const f0 = (await page.evaluate(() => __plumes.fiches()))[id0];
    note(fin0.vue === 'vFin' && f0 && f0.b === 1 && f0.d === d(1), `Jour 1 : « ${plan0.tid} » joué jusqu'à la fin, phrase ratée → revue le ${f0 && f0.d}`);
    await page.evaluate(() => __plumes.jours(1));
    const plan1 = await page.evaluate(() => __plumes.plan());
    await page.evaluate(() => __plumes.jour());
    const fin1 = await jouerSerie(page);
    const f1 = (await page.evaluate(() => __plumes.fiches()))[id0];
    note(plan1.rev.includes(id0) && fin1.vue === 'vFin' && f1.b === 2 && f1.d === d(4), `Jour 2 : la phrase ratée revient, réussie → boîte ${f1.b}, revue le ${f1.d}`);
    await page.evaluate(() => __plumes.jours(3));
    const plan3 = await page.evaluate(() => __plumes.plan());
    await page.evaluate(() => __plumes.jours(4));
    const plan4 = await page.evaluate(() => __plumes.plan());
    note(!plan3.rev.includes(id0) && plan4.rev.includes(id0), 'Elle n\'est pas revue 2 jours après, elle revient 3 jours après');
    // Encore des jours sans erreur : le niveau 2 est proposé après 4 textes réussis
    for (let j = 4; j < 12; j++) { await page.evaluate(n => __plumes.jours(n), j); await page.evaluate(() => __plumes.jour()); await jouerSerie(page); }
    const prop = await page.evaluate(() => !!document.querySelector('#fOui'));
    const jr = await page.evaluate(() => __plumes.journal());
    note(prop || jr.niveau > 1, `Après ${Object.keys(jr.faits).length} textes réussis, le niveau suivant est proposé`);
    await page.evaluate(() => __plumes.accueil());
    await page.screenshot({ path: 'captures/accueil-apres.png', fullPage: true });
    await page.evaluate(() => __plumes.aller('parent'));
    await page.screenshot({ path: 'captures/carnet-parent.png', fullPage: true });
    note(!erreurs.length, 'Console sans erreur pendant les dictées du jour' + (erreurs.length ? ' : ' + erreurs.join(' / ') : ''));
    await page.close();
  }

  // 4. Une phrase fausse donne les bons types d'erreur
  {
    const erreurs = [];
    const page = await nouvellePage(browser, 390, 844, erreurs);
    await page.evaluate(() => __plumes.lancer('n1-1', 'entiere', 0, 1));
    for (let n = 0; n < 9 && (await etat(page)).prep; n++) await page.evaluate(() => __plumes.juste());
    await page.evaluate(() => __plumes.ecrireFaux('Lila à deux chat noir.'));
    for (let k = 0; k < 3 && (await etat(page)).q.phase === 'relire'; k++) await page.evaluate(() => __plumes.juste());
    const r = (await etat(page)).q.res;
    note(r && r.justes === 2 && r.types.join(',') === 'homophone,accord,accord', `« Lila à deux chat noir. » → ${r && r.justes} justes, ${r && r.types.join(', ')}`);
    await page.screenshot({ path: 'captures/correction.png' });
    note(!erreurs.length, 'Console sans erreur (correction)' + (erreurs.length ? ' : ' + erreurs.join(' / ') : ''));
    await page.close();
  }

  // 5. Un texte ajouté par le parent, avec des mots entre étoiles
  {
    const erreurs = [];
    const page = await nouvellePage(browser, 390, 844, erreurs);
    await page.evaluate(() => __plumes.aller('niveau', 1));
    await page.evaluate(() => document.querySelector('#dAjout').showModal());
    await page.fill('#aTitre', 'Dictée du lundi');
    await page.fill('#aTexte', 'Les *enfants* jouent dans la cour. Ils *courent* vite !');
    await page.click('#aOk');
    await page.waitForTimeout(100);
    const vue = (await etat(page)).vue;
    const tid = await page.evaluate(() => JSON.parse(localStorage.getItem('marc.dictees.textes') || '[]').map(t => t.id)[0]);
    let ok = false;
    if (tid) {
      await page.evaluate(t => __plumes.lancer(t, 'trous', 0), tid);
      for (let n = 0; n < 5 && (await etat(page)).prep; n++) await page.evaluate(() => __plumes.juste());
      const e = await etat(page);
      ok = e.q && e.q.mode === 'trous' && e.q.trous.join() === 'enfants';
      await page.screenshot({ path: 'captures/texte-ajoute.png' });
      const fin = await jouerSerie(page);
      ok = ok && fin.vue === 'vFin';
    }
    note(ok, `Texte ajouté (${tid || 'absent'}, écran ${vue}) : joué à trous jusqu'à la fin`);
    note(!erreurs.length, 'Console sans erreur (texte ajouté)' + (erreurs.length ? ' : ' + erreurs.join(' / ') : ''));
    await page.close();
  }

  // 6. Hors ligne après une première visite
  if (URL.startsWith('https:') || URL.includes('localhost')) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto(URL);
    await page.evaluate(() => navigator.serviceWorker && navigator.serviceWorker.ready);
    await page.waitForTimeout(1500);
    await ctx.setOffline(true);
    let ok = false;
    try { await page.reload(); ok = await page.evaluate(() => !!window.__plumes && document.title === 'À vos plumes'); } catch (e) { /* hors ligne raté */ }
    note(ok, 'Fonctionne hors ligne après une première visite');
    await ctx.close();
  }

  // 7. L'appli apparaît sur « Mes applis »
  if (LIVE) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto('https://lechampdelaurore-boop.github.io/?nocache=' + Date.now());
    let ok = false;
    try { await page.waitForSelector('a[href*="a-vos-plumes"]', { timeout: 30000 }); ok = true; } catch (e) { /* pas trouvée */ }
    await page.screenshot({ path: 'captures/mes-applis.png', fullPage: true });
    note(ok, 'L\'appli apparaît sur « Mes applis »');
    await page.close();
  }

  await browser.close();
  const rapport = '| | Vérification |\n|---|---|\n' + lignes.join('\n');
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '## Test téléphone (site en ligne)\n\n' + rapport + '\n');
  process.exit(echec ? 1 : 0);
})();
