// Vérifie les textes de dictée (dans index.html, entre DÉBUT TEXTES et FIN TEXTES) :
// marques bien formées, longueur par niveau, groupes de mots, pièges reconnus.
// Usage : node tests/textes.cjs [index.html]
const fs = require('fs');
const html = fs.readFileSync(process.argv[2] || __dirname + '/../index.html', 'utf8');
const bloc = html.slice(html.indexOf('// DÉBUT TEXTES'), html.indexOf('// FIN TEXTES'));
const moteur = html.slice(html.indexOf('// === MOTEUR (début)'), html.indexOf('// === MOTEUR (fin)'));
const { TEXTES, ECOLE } = new Function(bloc + '; return { TEXTES, ECOLE };')();
const M = new Function(moteur + '; return M;')();
const CODES = ['sv', 'gn', 'n', 'att', 'pe', 'pa', 'er', 'e', 't', 'h', 'm', 'i', 'l'];
const TEMPS = ['présent', 'imparfait', 'futur', 'passé simple', 'plus-que-parfait', 'passé composé'];
const LONG = { 1: [25, 35], 2: [40, 55], 3: [55, 70], 4: [80, 100] };
let erreurs = 0, n = 0;
function non(msg) { erreurs++; console.log('✗ ' + msg); }
function verifPhrase(id, src) {
  n++;
  if ((src.match(/\{/g) || []).length !== (src.match(/\}/g) || []).length) return non(id + ' : accolades : ' + src);
  if (/\/ \/|^ ?\/|\/ ?$/.test(src)) non(id + ' : groupe vide : ' + src);
  const ph = M.lirePhrase(src);
  if (!ph.pieges.length) non(id + ' : aucun piège : ' + src);
  ph.groupes.forEach(g => { if (g.mots.length > 7) non(id + ' : groupe de ' + g.mots.length + ' mots : ' + g.texte); });
  if (/[{}|]/.test(ph.texte)) non(id + ' : marque restée dans le texte : ' + ph.texte);
  if (/\d/.test(ph.texte)) non(id + ' : chiffre (pas de chiffres au clavier) : ' + ph.texte);
  ph.pieges.forEach(p => {
    p.codes.forEach(c => {
      if (CODES.indexOf(c.k) < 0) non(id + ' : code inconnu ' + c.k + ' sur ' + p.mot);
      if (['sv', 'gn', 'n', 'att', 'pe', 'pa'].indexOf(c.k) >= 0 && !c.a) non(id + ' : ' + c.k + ' sans argument sur ' + p.mot);
      if (c.k === 't' && TEMPS.indexOf(c.a.split(':')[0]) < 0) non(id + ' : temps inconnu ' + c.a);
      if (c.k === 'h' && !M.famille(p.mot)) non(id + ' : homophone sans famille : ' + p.mot);
      if (c.k === 'er' && !/er$/.test(p.mot)) non(id + ' : er sur ' + p.mot);
      if (c.k === 'e' && !/(é|ée|és|ées)$/.test(p.mot)) non(id + ' : e sur ' + p.mot);
      if (c.k === 'l' && ['rj', 'vert', 'violet'].indexOf(c.a) < 0) non(id + ' : liste inconnue ' + c.a);
    });
    if (!p.codes.length) non(id + ' : piège sans code : ' + p.mot);
  });
  return ph;
}
TEXTES.forEach(t => {
  let mots = 0;
  t.phrases.forEach((s, i) => { const ph = verifPhrase(t.id + '#' + i, s); if (ph) mots += ph.mots.length; });
  const [a, b] = LONG[t.niv];
  console.log((mots < a || mots > b ? '✗' : '·') + ' ' + t.id + ' ' + t.titre + ' : ' + mots + ' mots, ' + t.phrases.length + ' phrases');
  if (mots < a || mots > b) erreurs++;
});
// Dictées de l'école : les mots marqués l: doivent être dans la liste de la fiche (même dictée)
let LISTES = null;
// Listes de mots des dictées de l'école (facultatif) : LISTES_DICTEES=chemin/vers/listes.json
try { LISTES = JSON.parse(fs.readFileSync(process.env.LISTES_DICTEES, 'utf8')); } catch (e) { /* pas de listes : on saute ce contrôle */ }
ECOLE.forEach(t => {
  const parG = { rj: 0, vert: 0, violet: 0 };
  t.phrases.forEach(([g, s], i) => {
    if (!(g in parG)) non(t.id + ' : groupe ' + g);
    const ph = verifPhrase(t.id + '#' + i, s); if (!ph) return;
    parG[g] += ph.mots.length;
    if (LISTES) ph.pieges.forEach(p => p.codes.filter(c => c.k === 'l').forEach(c => {
      const d = LISTES.dictees.find(x => x.numero === t.n), gr = d.groupes[c.a === 'rj' ? 'rouge-jaune' : c.a] || {};
      const tous = []; Object.values(gr).forEach(l => l.forEach(w => tous.push(M.sansAccent(w.mot).toLowerCase().replace(/^(se |s')/, ''))));
      const m = M.sansAccent(p.mot).toLowerCase().replace(/^(l'|d'|s'|se )/, '');
      if (/^(dev|pouv|peu)/.test(m) && tous.some(w => /^(devoir|pouvoir)$/.test(w))) return;
      const ok = tous.some(w => m === w || m.startsWith(w.slice(0, Math.max(3, w.length - 2))) || w.startsWith(m.slice(0, Math.max(3, m.length - 2))) || w.includes(m) || m.includes(w));
      if (!ok) non(t.id + ' : « ' + p.mot + ' » marqué l:' + c.a + ' mais absent de la liste');
    }));
  });
  console.log('· ' + t.id + ' ' + t.titre + ' : rouge-jaune ' + parG.rj + ' mots, + vert ' + parG.vert + ', + violet ' + parG.violet);
});
console.log(n + ' phrases vérifiées, ' + erreurs + ' problème(s).');
process.exit(erreurs ? 1 : 0);
