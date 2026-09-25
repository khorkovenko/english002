import React, {useEffect, useRef, useState} from "react";

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;600&family=Noto+Serif:ital,wght@0,400;1,400&display=swap');
.sp{--paper:#EDF1F4;--card:#FFFFFF;--ink:#182430;--muted:#5E6E7C;--line:#C9D3DB;--tongue:#E4607F;--tongue-deep:#B93A5B;--vowel:#1D8C8F;--cons:#4652B8;--diph:#B8681F;--focus:#4652B8;background:var(--paper);color:var(--ink);font:16px/1.5 "Noto Sans",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased;box-sizing:border-box}
.sp *,.sp *::before,.sp *::after{box-sizing:inherit}
.sp button{font:inherit;color:inherit;background:none;border:0;cursor:pointer}
.sp button:focus-visible,.sp select:focus-visible,.sp input:focus-visible{outline:2px solid var(--focus);outline-offset:2px}
.sp mark{background:none;color:var(--tongue-deep);font-weight:600}
.sp .ipa{font-family:"Noto Serif","Noto Sans","Charis SIL","Doulos SIL",serif}
.sp .topbar{display:flex;flex-wrap:wrap;gap:12px 24px;align-items:center;padding:14px 24px 6px;max-width:1280px;margin:0 auto}
.sp .voicebox{display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-size:14px;color:var(--muted)}
.sp .voicebox select{font:inherit;color:var(--ink);background:var(--card);border:1px solid var(--line);border-radius:8px;padding:5px 8px;max-width:220px}
.sp .voicebox input[type=range]{width:110px;accent-color:var(--ink)}
.sp .seg{display:inline-flex;border:1px solid var(--line);border-radius:8px;overflow:hidden}
.sp .seg button{padding:5px 10px;color:var(--muted)}
.sp .seg button[aria-pressed="true"]{background:var(--ink);color:var(--paper)}
.sp .body{max-width:1280px;margin:0 auto;padding:8px 24px 48px}
.sp .sounds{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:28px;align-items:start}
.sp .chart h2{font-size:14px;font-weight:600;color:var(--muted);margin:22px 0 10px}
.sp .chart h2:first-child{margin-top:4px}
.sp .chart h2 span{font-weight:400;margin-left:8px}
.sp .vgrid{display:grid;grid-template-columns:repeat(5,1fr);grid-auto-rows:56px;gap:6px}
.sp .vgrid .axis{grid-column:1 / -1;display:flex;justify-content:space-between;font-size:12px;color:var(--muted);padding:0 6px}
.sp .dgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.sp .key{border:1px solid var(--line);background:var(--card);border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;padding:4px 2px;min-height:52px;position:relative;transition:transform .12s}
.sp .key .ipa{font-size:24px;line-height:1.1}
.sp .key .ex{font-size:11px;color:var(--muted);white-space:nowrap}
.sp .key:hover{transform:translateY(-1px)}
.sp .key[aria-pressed="true"]{border-color:var(--ink);box-shadow:inset 0 0 0 1px var(--ink)}
.sp .key.v[aria-pressed="true"] .ipa{color:var(--vowel)}
.sp .key.d[aria-pressed="true"] .ipa{color:var(--diph)}
.sp .key.c[aria-pressed="true"] .ipa{color:var(--cons)}
.sp .ctable{width:100%;border-collapse:separate;border-spacing:4px;table-layout:fixed}
.sp .ctable th{font-size:11px;font-weight:400;color:var(--muted);padding:2px 0;text-align:center;line-height:1.2}
.sp .ctable th.row{text-align:right;padding-right:6px;width:74px}
.sp .ctable td{padding:0;vertical-align:top}
.sp .ctable .pair{display:flex;gap:3px}
.sp .ctable .pair .key{flex:1;min-height:46px;border-radius:8px}
.sp .ctable .pair .key .ipa{font-size:21px}
.sp .ctable .key .ex{display:none}
.sp .legend{font-size:12px;color:var(--muted);margin-top:14px;line-height:1.6}
.sp .detail{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:22px 24px 26px;position:sticky;top:12px}
.sp .detail .head{display:flex;align-items:baseline;gap:18px;flex-wrap:wrap}
.sp .detail .sym{font-size:84px;line-height:1;margin:-6px 0 0}
.sp .detail .sym.v{color:var(--vowel)}.sp .detail .sym.d{color:var(--diph)}.sp .detail .sym.c{color:var(--cons)}
.sp .detail .name{font-size:17px;font-weight:600}
.sp .detail .name small{display:block;font-weight:400;color:var(--muted);font-size:14px}
.sp .mouth{width:100%;max-width:460px;margin:8px auto 0;display:block;background:var(--paper);border-radius:14px}
.sp .mouth .skin{fill:none;stroke:var(--line);stroke-width:2.4;stroke-linecap:round}
.sp .mouth .bone{fill:none;stroke:var(--ink);stroke-width:3;stroke-linecap:round;opacity:.7}
.sp .mouth .tooth{fill:var(--card);stroke:var(--ink);stroke-width:1.4}
.sp .mouth .tongue{fill:none;stroke:var(--tongue);stroke-width:7;stroke-linecap:round;stroke-linejoin:round;transition:d .35s cubic-bezier(.4,0,.2,1)}
.sp .mouth .lipline{fill:none;stroke:var(--ink);stroke-width:4;stroke-linecap:round;transition:d .35s cubic-bezier(.4,0,.2,1)}
.sp .mouth .jaw{transition:transform .35s cubic-bezier(.4,0,.2,1)}
.sp .mouth .velum{fill:none;stroke:var(--ink);stroke-width:4;stroke-linecap:round;opacity:.7;transition:d .35s}
.sp .mouth .spot{fill:var(--cons);opacity:0;transition:opacity .3s}
.sp .mouth .spot.on{opacity:.25}
.sp .mouth text{font:12px "Noto Sans",sans-serif;fill:var(--muted)}
@media (prefers-reduced-motion:reduce){.sp .mouth *,.sp .key{transition:none!important;animation:none!important}}
.sp .how{margin:14px 0 0;color:var(--muted);font-size:14px}
.sp .words{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
.sp .wbtn{border:1px solid var(--line);border-radius:10px;padding:8px 12px;display:flex;align-items:center;gap:8px;font-size:16px}
.sp .wbtn:hover{border-color:var(--ink)}
.sp .wbtn .play{width:0;height:0;border-left:9px solid var(--ink);border-top:6px solid transparent;border-bottom:6px solid transparent}
.sp .wbtn.primary{background:var(--ink);color:var(--paper);border-color:var(--ink)}
.sp .wbtn.primary .play{border-left-color:var(--paper)}
.sp .wbtn.small{padding:5px 10px;font-size:14px;border-style:dashed;align-items:flex-start}
.sp .wbtn .tr{display:block;font-size:13px;color:var(--muted);font-weight:400;line-height:1.2;margin-top:2px}
.sp .wbtn .dash{color:var(--muted);align-self:flex-start;margin-top:2px}
.sp .inword{flex-basis:100%;font-size:12px;color:var(--muted);margin:4px 0 -4px}
.sp .tip{margin-top:16px;padding:12px 14px;border-left:3px solid var(--tongue);background:var(--paper);border-radius:0 10px 10px 0;font-size:14px}
.sp .tip b{font-weight:600}
.sp .contrast{margin-top:14px;font-size:14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.sp .contrast .ipa{font-size:18px}
.sp .note{color:var(--muted);font-size:13px;margin-top:10px}
.sp .do{margin:18px 0 0;padding:0;list-style:none;counter-reset:st;display:grid;gap:10px;font-size:15px}
.sp .do li{display:grid;grid-template-columns:26px 1fr;gap:10px;align-items:start}
.sp .do li::before{counter-increment:st;content:counter(st);width:24px;height:24px;border-radius:50%;background:var(--ink);color:var(--paper);font-size:13px;font-weight:600;display:flex;align-items:center;justify-content:center;margin-top:1px}
.sp .do li b{font-weight:600}
.sp .mirror{margin:14px 0 0;padding:10px 14px;border-radius:10px;background:var(--paper);font-size:14px}
.sp .mirror b{font-weight:600}
@media (max-width:900px){
.sp .sounds{grid-template-columns:1fr}
.sp .detail{position:static;order:-1}
.sp .topbar{padding:12px 16px 6px}
.sp .body{padding:6px 16px 40px}
.sp .detail .sym{font-size:64px}
.sp .mouth{max-width:100%}
.sp .ctable th.row{width:58px;font-size:10px}
.sp .ctable .pair .key .ipa{font-size:18px}
}
`;

const V = (s, name, h, f, r, long, words, col, row, how, tip, contrast, us, lips) => ({s, cat: "v", name, h, f, r, long, words, col, row, how, tip, contrast, us, lips});
const VOWELS = [
    V('iː', 'long close front vowel', 1, 1, 0, true, ['sh[ee]p', 's[ea]', 'k[ey]'], 1, 1,
        'Push the front of your tongue high, almost touching the roof of the mouth, and spread your lips as in a small smile. Hold the sound; it is long.',
        'The difference from <span class="ipa">/ɪ/</span> is not only length: <span class="ipa">/iː/</span> is tense and forward, <span class="ipa">/ɪ/</span> is relaxed and central. If <em>sheep</em> and <em>ship</em> sound the same, spread the lips more for <em>sheep</em>.',
        {s: 'ɪ', pair: ['sheep', 'ship']}, '', 'spread'),
    V('ɪ', 'short lax front vowel', .75, .8, 0, false, ['sh[i]p', 'b[i]g', '[i]t'], 2, 1,
        'Start from <span class="ipa">/iː/</span>, then let the tongue drop a little and move slightly back. Relax the lips completely. Very short.',
        'Do not smile for this one. <em>Ship</em>, <em>bit</em>, <em>live</em> are said with a lazy mouth. This is also the vowel in unstressed <em>-es</em> and <em>-ed</em>: <em>wanted</em>, <em>boxes</em>.',
        {s: 'iː', pair: ['ship', 'sheep']}, '', 'relaxed'),
    V('ʊ', 'short lax back vowel', .75, .25, .55, false, ['f[oo]t', 'p[u]t', 'b[oo]k'], 4, 1,
        'Tongue high and back but relaxed, lips loosely rounded, jaw almost closed. Short and soft.',
        '<em>Good</em>, <em>book</em>, <em>could</em>, <em>woman</em> all have this relaxed vowel, not the tight <span class="ipa">/uː/</span> of <em>food</em>.',
        {s: 'uː', pair: ['pull', 'pool']}, '', 'loosely rounded'),
    V('uː', 'long close back vowel', 1, .1, 1, true, ['f[oo]d', 'bl[ue]', 'tw[o]'], 5, 1,
        'Back of the tongue high, lips rounded tightly and pushed forward as if to whistle. Long.',
        'After <em>y</em>-sounds it is written in many ways: <em>you</em>, <em>new</em>, <em>few</em>, <em>use</em>. Keep the lip rounding until the end of the vowel.',
        {s: 'ʊ', pair: ['pool', 'pull']}, '', 'tightly rounded'),
    V('e', 'short front vowel', .5, .9, 0, false, ['b[e]d', 'h[ea]d', 's[ai]d'], 1, 2,
        'Front of the tongue at mid height, jaw a little more open than for <span class="ipa">/ɪ/</span>, lips neutral. Short.',
        'Keep it clearly different from <span class="ipa">/æ/</span>: <em>bed</em> is not <em>bad</em>, <em>pen</em> is not <em>pan</em>. For <span class="ipa">/e/</span> the jaw is half open; for <span class="ipa">/æ/</span> open it wide.',
        {s: 'æ', pair: ['bed', 'bad']}, '', 'neutral'),
    V('ə', 'schwa, the weak vowel', .55, .5, 0, false, ['[a]bout', 'teach[er]', 'comm[o]n'], 3, 2,
        'Tongue in the middle of the mouth, everything relaxed, mouth barely open. Extremely short and quiet. It only appears in unstressed syllables.',
        'This is the most common vowel in English and the biggest single upgrade at B2: <em>to</em>, <em>for</em>, <em>of</em>, <em>and</em>, <em>can</em>, <em>than</em> become <span class="ipa">/tə fə əv ən kən ðən/</span> in normal speech. Using full vowels there is what makes speech sound foreign and slow.',
        {s: 'ɜː', pair: ['forward', 'foreword']}, '', 'relaxed, almost closed'),
    V('ɜː', 'long central vowel', .5, .5, 0, true, ['b[ir]d', 'w[or]d', 'n[ur]se'], 3, 3,
        'Tongue in the centre of the mouth, jaw half open, lips neutral. Long and steady, like a thoughtful "er".',
        'No <em>r</em> is pronounced in British English here. In American English the tongue curls up for an r-coloured vowel <span class="ipa">/ɝ/</span>. Both are fine; pick one and be consistent.',
        {s: 'ɔː', pair: ['bird', 'board']}, 'American: r-coloured, the tongue tip rises during the vowel.', 'neutral'),
    V('ɔː', 'long open-mid back vowel', .55, .1, .8, true, ['th[ou]ght', 'f[our]', 'd[oor]'], 5, 3,
        'Back of the tongue at mid height, lips firmly rounded, jaw half open. Long.',
        'Many spellings: <em>caught</em>, <em>bought</em>, <em>law</em>, <em>door</em>, <em>war</em>, <em>talk</em>. Round the lips more than you think you need.',
        {s: 'ɒ', pair: ['caught', 'cot']}, 'American: often <span class="ipa">/ɑ/</span> in <em>thought</em>; <em>four</em>, <em>door</em> keep <span class="ipa">/ɔr/</span>.', 'rounded'),
    V('æ', 'short open front vowel', .2, .9, 0, false, ['c[a]t', 'b[a]d', 'h[a]nd'], 1, 4,
        'Open the jaw wide, keep the tongue low and forward, lips spread. Short but full.',
        'The mouth is much more open than for <span class="ipa">/e/</span>. Say <em>bad, bad, bad</em> with the jaw dropping each time; if it sounds like <em>bed</em>, open more.',
        {s: 'e', pair: ['bad', 'bed']}, 'American: a little longer and often closer to <span class="ipa">/eə/</span> before <em>n</em> and <em>m</em>.', 'spread, jaw wide'),
    V('ʌ', 'short open-mid central vowel', .3, .45, 0, false, ['c[u]p', 'l[o]ve', 'b[u]s'], 3, 4,
        'Tongue low in the centre, jaw fairly open, lips neutral. Short and sharp.',
        'Not the same as <span class="ipa">/æ/</span>: <em>cup</em> is not <em>cap</em>, <em>luck</em> is not <em>lack</em>. The tongue stays central, not forward.',
        {s: 'æ', pair: ['cup', 'cap']}, '', 'neutral'),
    V('ɑː', 'long open back vowel', .08, .15, 0, true, ['c[ar]', 'f[a]ther', 'h[ear]t'], 4, 4,
        'Jaw wide open, tongue low and pulled back, lips relaxed. Long, like at the dentist.',
        'In British English <em>car</em> has no <em>r</em> sound. Contrast with <span class="ipa">/ʌ/</span>: <em>heart</em> vs <em>hut</em>, <em>calm</em> vs <em>come</em>.',
        {s: 'ʌ', pair: ['heart', 'hut']}, 'American: <em>car</em>, <em>heart</em> have an audible <span class="ipa">/r/</span>; <em>father</em> stays <span class="ipa">/ɑ/</span>.', 'relaxed, jaw wide'),
    V('ɒ', 'short open back rounded vowel', .15, .1, .55, false, ['h[o]t', 'w[a]nt', '[o]n'], 5, 4,
        'Jaw open, tongue low and back, lips slightly rounded. Short.',
        'Keep it short and rounded so it does not become <span class="ipa">/ɔː/</span>: <em>cot</em> vs <em>caught</em>, <em>not</em> vs <em>nought</em>.',
        {s: 'ɔː', pair: ['cot', 'caught']}, 'American: usually unrounded <span class="ipa">/ɑ/</span>, so <em>hot</em> sounds close to British <em>heart</em> without the length.', 'slightly rounded'),
];
const D = (s, from, to, words, how, tip, us) => ({s, cat: "d", from, to, words, how, tip, us, name: "diphthong " + from.s + " → " + to.s});
const vp = (h, f, r) => ({h, f, r, s: "a"});
const vow = s => VOWELS.find(v => v.s === s);
const DIPHS = [
    D('eɪ', vow('e'), vow('ɪ'), ['f[a]ce', 'd[ay]', 'r[ai]n'], 'Start at <span class="ipa">/e/</span> and glide upward toward <span class="ipa">/ɪ/</span>. The first part is longer and louder; the glide is quick.', 'A flat pure <span class="ipa">/e/</span> makes <em>day</em> sound like <em>de</em>. Let the jaw close and the tongue rise at the end.', ''),
    D('aɪ', vp(.1, .6, 0), vow('ɪ'), ['pr[i]ce', 'm[y]', 't[i]me'], 'Open the jaw wide for a central <span class="ipa">/a/</span>, then close it as the tongue moves up and forward to <span class="ipa">/ɪ/</span>.', 'Before voiceless consonants the vowel is shorter: <em>write</em> vs <em>ride</em>. Keep the glide even so.', ''),
    D('ɔɪ', vow('ɔː'), vow('ɪ'), ['ch[oi]ce', 'b[oy]', 'n[oi]se'], 'Start with rounded lips at <span class="ipa">/ɔ/</span>, then unround and move the tongue forward to <span class="ipa">/ɪ/</span>.', 'The lip movement from round to spread is what makes this sound clear.', ''),
    D('əʊ', vow('ə'), vow('ʊ'), ['g[oa]t', 'sh[ow]', 'n[o]'], 'Begin with a relaxed central <span class="ipa">/ə/</span> and glide back and up to a lightly rounded <span class="ipa">/ʊ/</span>.', 'A pure <span class="ipa">/o/</span> as in many languages sounds foreign in both British and American English. The lips must move.', 'American <span class="ipa">/oʊ/</span>: starts more rounded and further back.'),
    D('aʊ', vp(.1, .5, 0), vow('ʊ'), ['m[ou]th', 'n[ow]', 'h[ou]se'], 'Jaw wide open for <span class="ipa">/a/</span>, then close the jaw and round the lips toward <span class="ipa">/ʊ/</span>.', 'Do not stop at the open vowel: <em>now</em> needs the rounded ending.', ''),
    D('ɪə', vow('ɪ'), vow('ə'), ['n[ear]', 'h[ere]', 'b[eer]'], 'Start at <span class="ipa">/ɪ/</span> and relax toward the centre for <span class="ipa">/ə/</span>. No <em>r</em> is pronounced.', 'Before a vowel the <em>r</em> returns: <em>near it</em> → <span class="ipa">/nɪər ɪt/</span>. This is linking r.', 'American: <span class="ipa">/ɪr/</span> with a real <em>r</em>.'),
    D('eə', vow('e'), vow('ə'), ['squ[are]', 'h[air]', 'th[ere]'], 'Start at <span class="ipa">/e/</span> with the jaw half open and slide to a relaxed <span class="ipa">/ə/</span>.', 'Modern British speakers often say a long <span class="ipa">/ɛː/</span> with almost no glide; either is fine.', 'American: <span class="ipa">/er/</span>.'),
    D('ʊə', vow('ʊ'), vow('ə'), ['c[ure]', 't[our]', 'p[ure]'], 'Start at a rounded <span class="ipa">/ʊ/</span> and unround toward <span class="ipa">/ə/</span>.', 'Rare. Many speakers now use <span class="ipa">/ɔː/</span> instead: <em>sure</em> = <em>shore</em>. Both are accepted.', 'American: <span class="ipa">/ʊr/</span>.'),
];
const PLACE = {
    bilabial: {label: "both lips", adj: "bilabial", spot: [93, 172]},
    labiodental: {label: "lip + teeth", adj: "labiodental", spot: [104, 168]},
    dental: {label: "tongue + teeth", adj: "dental", spot: [112, 162]},
    alveolar: {label: "tongue + ridge", adj: "alveolar", spot: [128, 154]},
    postalveolar: {label: "behind ridge", adj: "post-alveolar", spot: [150, 146]},
    palatal: {label: "hard palate", adj: "palatal", spot: [170, 132]},
    velar: {label: "soft palate", adj: "velar", spot: [246, 122]},
    glottal: {label: "throat", adj: "glottal", spot: [297, 321]},
};
const PLACES = Object.keys(PLACE);
const MANNERS = ["plosive", "affricate", "fricative", "nasal", "approximant"];
const C = (s, voiced, place, manner, words, how, tip, contrast, us) => ({s, cat: "c", voiced, place, manner, words, how, tip, contrast, us, name: (voiced ? "voiced " : "voiceless ") + PLACE[place].adj + " " + manner});
const CONS = [
    C('p', false, 'bilabial', 'plosive', ['[p]en', 'ha[pp]y', 'sto[p]'], 'Close both lips, let air pressure build behind them, then release it in a small explosion. At the start of a stressed syllable add a puff of breath.', 'Put a sheet of paper in front of your mouth: <em>pin</em> should move it, <em>bin</em> should not. Without that puff, <em>pin</em> sounds like <em>bin</em> to English ears.', {s: 'b', pair: ['pin', 'bin']}, ''),
    C('b', true, 'bilabial', 'plosive', ['[b]ad', 'ra[bb]it', 'jo[b]'], 'Same lip closure as <span class="ipa">/p/</span>, but the vocal folds vibrate and there is no puff of air.', 'Keep it voiced at the end of words: <em>job</em>, <em>rob</em>, <em>cab</em>. Devoicing final consonants turns <em>cab</em> into <em>cap</em>.', {s: 'p', pair: ['bin', 'pin']}, ''),
    C('t', false, 'alveolar', 'plosive', ['[t]ea', 'be[tt]er', 'ca[t]'], 'The tongue tip touches the ridge just behind the upper teeth, not the teeth themselves. Release with a puff at the start of stressed syllables.', 'Touching the teeth gives a dull, dental <em>t</em>. Feel for the bumpy ridge behind the teeth and tap there.', {s: 'd', pair: ['ten', 'den']}, 'American: between vowels <em>better</em>, <em>water</em> have a quick flap that sounds close to <em>d</em>.'),
    C('d', true, 'alveolar', 'plosive', ['[d]og', 'la[dd]er', 'ba[d]'], 'Tongue tip on the ridge behind the teeth, voice on, gentle release.', 'Past tense <em>-ed</em> after a voiced sound is <span class="ipa">/d/</span>: <em>played</em>, <em>lived</em>. After a voiceless sound it is <span class="ipa">/t/</span>: <em>worked</em>, <em>stopped</em>.', {s: 't', pair: ['den', 'ten']}, ''),
    C('k', false, 'velar', 'plosive', ['[k]ey', '[c]at', 'ba[ck]'], 'The back of the tongue rises to touch the soft palate, air builds up, then releases with a puff.', 'Same aspiration rule as <span class="ipa">/p/</span> and <span class="ipa">/t/</span>: <em>coat</em> with a puff, <em>goat</em> without.', {s: 'g', pair: ['coat', 'goat']}, ''),
    C('g', true, 'velar', 'plosive', ['[g]et', 'bi[gg]er', 'ba[g]'], 'Back of the tongue against the soft palate, voice on, gentle release.', 'Keep the voicing at the end: <em>bag</em> is not <em>back</em>, <em>dog</em> is not <em>dock</em>.', {s: 'k', pair: ['goat', 'coat']}, ''),
    C('f', false, 'labiodental', 'fricative', ['[f]ish', 'co[ff]ee', 'li[f]e'], 'The lower lip touches the edge of the upper teeth and air hisses through the gap.', 'Light contact only; do not bite the lip.', {s: 'v', pair: ['fan', 'van']}, ''),
    C('v', true, 'labiodental', 'fricative', ['[v]ery', 'ne[v]er', 'fi[v]e'], 'Same position as <span class="ipa">/f/</span> with the voice switched on. You should feel the lip buzz.', 'Two common substitutions to avoid: <span class="ipa">/w/</span> (<em>wery</em>) and <span class="ipa">/f/</span> at the end (<em>fife</em> for <em>five</em>). The lip must touch the teeth and keep buzzing.', {s: 'w', pair: ['vine', 'wine']}, ''),
    C('θ', false, 'dental', 'fricative', ['[th]ink', 'ba[th]', 'au[th]or'], 'Put the tip of the tongue against the back of the upper teeth, or just between the teeth, and blow. Breath only, no voice.', 'Not <span class="ipa">/s/</span>, not <span class="ipa">/t/</span>, not <span class="ipa">/f/</span>. Practise in front of a mirror until you can see the tongue tip: <em>think, thin, three, month</em>.', {s: 's', pair: ['think', 'sink']}, ''),
    C('ð', true, 'dental', 'fricative', ['[th]is', 'mo[th]er', 'brea[th]e'], 'Same tongue position as <span class="ipa">/θ/</span> with the voice on. The tongue tip buzzes against the teeth.', 'Used in the most frequent words: <em>the, this, that, they, there, then, with</em>. Replacing it with <span class="ipa">/d/</span> or <span class="ipa">/z/</span> is very noticeable.', {s: 'd', pair: ['then', 'den']}, ''),
    C('s', false, 'alveolar', 'fricative', ['[s]ee', 'mi[ss]', 'hou[s]e'], 'Tongue tip close to the ridge behind the teeth, a narrow groove down the middle, air hisses through. Teeth nearly closed.', 'Keep it sharp and high. The plural and third-person <em>-s</em> is <span class="ipa">/s/</span> only after voiceless sounds: <em>cats</em>, <em>works</em>.', {s: 'z', pair: ['Sue', 'zoo']}, ''),
    C('z', true, 'alveolar', 'fricative', ['[z]oo', 'la[z]y', 'do[g]s'], 'Same as <span class="ipa">/s/</span> with the voice on; you should feel the buzz in your throat.', 'Most <em>-s</em> endings are actually <span class="ipa">/z/</span>: <em>dogs, lives, goes, is, was, these</em>. Saying <span class="ipa">/s/</span> there is a very common B2 habit.', {s: 's', pair: ['zoo', 'Sue']}, ''),
    C('ʃ', false, 'postalveolar', 'fricative', ['[sh]e', 'na[ti]on', 'fi[sh]'], 'The blade of the tongue rises toward the area just behind the ridge, lips slightly rounded, air hisses over a wider surface than for <span class="ipa">/s/</span>.', 'Also spelled <em>-tion, -cial, -sure, ch</em> (<em>machine</em>). Contrast <em>she</em>/<em>sea</em>, <em>ship</em>/<em>sip</em>.', {s: 's', pair: ['ship', 'sip']}, ''),
    C('ʒ', true, 'postalveolar', 'fricative', ['mea[s]ure', 'vi[si]on', 'bei[ge]'], 'Same position as <span class="ipa">/ʃ/</span> with the voice on.', 'Rare and never at the start of native words. Found in <em>usual, pleasure, television, garage</em>.', {s: 'dʒ', pair: ['pleasure', 'pledger']}, ''),
    C('h', false, 'glottal', 'fricative', ['[h]at', 'a[h]ead', '[wh]o'], 'The mouth takes the shape of the following vowel and you simply breathe out. No friction in the throat.', 'Softer than the harsh <em>ch</em> of German, Russian or Spanish. Imagine fogging a mirror. Silent in <em>hour, honest, heir</em>, and usually dropped in weak <em>he, him, her, have</em> mid-sentence.', {s: '', pair: ['hat', 'at']}, ''),
    C('tʃ', false, 'postalveolar', 'affricate', ['[ch]air', 'tea[ch]er', 'ma[tch]'], 'Start with the tongue in the <span class="ipa">/t/</span> position but a little further back, then release into <span class="ipa">/ʃ/</span>. One quick movement.', 'Contrast with <span class="ipa">/ʃ/</span>: <em>chip</em>/<em>ship</em>, <em>watch</em>/<em>wash</em>. The stop at the beginning is what makes it <span class="ipa">/tʃ/</span>.', {s: 'ʃ', pair: ['chip', 'ship']}, ''),
    C('dʒ', true, 'postalveolar', 'affricate', ['[j]udge', 'a[g]e', 'brid[ge]'], 'Like <span class="ipa">/tʃ/</span> with the voice on: a short <span class="ipa">/d/</span> released into <span class="ipa">/ʒ/</span>.', 'Keep it voiced at the end: <em>age</em> not <em>H</em>, <em>bridge</em> not <em>britch</em>. Contrast <em>jeep</em>/<em>cheap</em>, <em>Jane</em>/<em>chain</em>.', {s: 'tʃ', pair: ['jeep', 'cheap']}, ''),
    C('m', true, 'bilabial', 'nasal', ['[m]an', 'su[mm]er', 'ti[m]e'], 'Lips closed, soft palate lowered, so the voiced air goes out through the nose.', 'Hum it: you can hold <span class="ipa">/m/</span> as long as you have breath.', {s: 'n', pair: ['some', 'sun']}, ''),
    C('n', true, 'alveolar', 'nasal', ['[n]o', 'di[nn]er', 'su[n]'], 'Tongue tip on the ridge behind the teeth, soft palate lowered, voice through the nose.', 'In fast speech <em>n</em> often becomes <span class="ipa">/m/</span> before <em>p, b</em> (<em>ten people</em>) and <span class="ipa">/ŋ/</span> before <em>k, g</em> (<em>ten cats</em>). That is normal.', {s: 'ŋ', pair: ['sin', 'sing']}, ''),
    C('ŋ', true, 'velar', 'nasal', ['si[ng]', 'thi[n]k', 'lo[ng]'], 'Back of the tongue against the soft palate, soft palate lowered, voice through the nose. The tongue tip stays down.', 'At the end of <em>sing, long, going</em> there is no <span class="ipa">/g/</span> or <span class="ipa">/k/</span> released afterwards. Before <em>k</em> (<em>think, bank</em>) the <em>n</em> is always <span class="ipa">/ŋ/</span>.', {s: 'n', pair: ['sing', 'sin']}, ''),
    C('l', true, 'alveolar', 'approximant', ['[l]ight', 'ye[ll]ow', 'fee[l]'], 'Tongue tip touches the ridge behind the teeth while the sides stay down so voiced air flows around them.', 'Two kinds: clear <em>l</em> before vowels (<em>light</em>), and dark <em>l</em> at the end of words (<em>feel, milk</em>) where the back of the tongue also rises and the sound becomes almost a vowel.', {s: 'r', pair: ['light', 'right']}, ''),
    C('r', true, 'postalveolar', 'approximant', ['[r]ed', 'so[rr]y', 'ca[rr]y'], 'Curl the tongue tip up and back toward the area behind the ridge without touching anything. Lips slightly rounded. Voice on.', 'No trill, no tap, no contact. In British English <em>r</em> is only pronounced before a vowel: <em>car</em> has none, <em>car is</em> has one.', {s: 'l', pair: ['right', 'light']}, 'American: pronounced everywhere, including <em>car, hard, teacher</em>.'),
    C('w', true, 'bilabial', 'approximant', ['[w]et', 'a[w]ay', '[w]ine'], 'Round the lips tightly as for <span class="ipa">/uː/</span> and raise the back of the tongue, then glide into the next vowel.', 'The lips never touch the teeth. Contrast <em>wine</em>/<em>vine</em>, <em>west</em>/<em>vest</em>.', {s: 'v', pair: ['wine', 'vine']}, ''),
    C('j', true, 'palatal', 'approximant', ['[y]es', '[u]se', '[y]ellow'], 'Tongue front high near the hard palate as for <span class="ipa">/iː/</span>, then glide into the following vowel.', 'Hidden in spellings: <em>use, few, new, Europe, million</em>. British <em>tune, duke</em> have it; American usually does not.', {s: '', pair: ['yes', 'use']}, ''),
];
const ALL = [...VOWELS, ...DIPHS, ...CONS];

const REST = {jaw: 8, peak: [200, 182], tip: [146, 206], round: 0, lips: "open", velum: "up", spot: null};
const vowelShape = v => {
    const jaw = 2 + (1 - v.h) * 26;
    const px = 150 + (1 - v.f) * 105, py = 210 - v.h * 74 + jaw * .2;
    const tx = 140 + (1 - v.f) * 14, ty = 196 + jaw;
    return {jaw, peak: [px, py], tip: [tx, ty], round: v.r, spread: v.f * (1 - v.r), lips: "open", velum: "up", spot: null};
};
const consShape = c => {
    const o = {jaw: 6, peak: [200, 180], tip: [146, 204], round: 0, spread: .2, lips: "open", velum: c.manner === "nasal" ? "down" : "up", spot: PLACE[c.place].spot};
    switch (c.place) {
        case "bilabial":
            if (c.manner === "approximant") {
                o.round = 1;
                o.peak = [240, 140];
                o.tip = [160, 206];
            } else {
                o.lips = "closed";
                o.jaw = -4;
            }
            break;
        case "labiodental":
            o.lips = "teeth";
            o.jaw = 2;
            break;
        case "dental":
            o.tip = [108, 160];
            o.peak = [190, 182];
            o.jaw = 8;
            break;
        case "alveolar":
            if (c.manner === "fricative") {
                o.tip = [128, 159];
                o.peak = [196, 176];
                o.jaw = 3;
            } else if (c.manner === "approximant") {
                o.tip = [127, 152];
                o.peak = [214, 186];
                o.jaw = 8;
            } else {
                o.tip = [127, 151];
                o.peak = [196, 176];
                o.jaw = 5;
            }
            break;
        case "postalveolar":
            if (c.manner === "approximant") {
                o.tip = [140, 158];
                o.peak = [212, 170];
                o.round = .5;
                o.jaw = 8;
            } else {
                o.tip = [142, 160];
                o.peak = [164, 138];
                o.round = .4;
                o.jaw = 4;
            }
            break;
        case "palatal":
            o.peak = [152, 138];
            o.tip = [140, 194];
            o.jaw = 4;
            o.spread = .8;
            break;
        case "velar":
            o.peak = [242, 122];
            o.tip = [160, 208];
            o.jaw = 7;
            break;
        case "glottal":
            o.jaw = 12;
            o.peak = [205, 185];
            o.tip = [146, 210];
            break;
        default:
    }
    return o;
};
const releaseOf = (sh, c) => {
    const r = {...sh, spot: null};
    if (c.place === "bilabial") {
        r.lips = "open";
        r.jaw = 6;
    } else {
        r.tip = [sh.tip[0] + 6, sh.tip[1] + 10];
        r.peak = [sh.peak[0], sh.peak[1] + 10];
        r.jaw = sh.jaw + 3;
    }
    return r;
};
const shapeOf = snd => snd.cat === "v" ? vowelShape(snd) : snd.cat === "d" ? vowelShape(snd.from) : consShape(snd);
const tonguePath = p => {
    const [px, py] = p.peak, [tx, ty] = p.tip;
    const k = Math.min(55, 282 - px);
    return `M272 244 C272 ${py + 40} ${px + k} ${py} ${px} ${py} C${px - 52} ${py} ${tx + 30} ${ty - 14} ${tx} ${ty}`;
};
const lipPaths = p => {
    const pr = p.round * 11 - (p.spread || 0) * 3;
    const up = `M94 152 C${86 - pr} 157 ${84 - pr} 167 98 172`;
    const lo = p.lips === "teeth" ? "M104 170 C92 172 88 180 96 208" : `M96 176 C${80 - pr} 184 ${78 - pr} 200 96 208`;
    return {up, lo};
};
const VELUM_UP = "M238 118 C265 116 292 128 302 146", VELUM_DOWN = "M238 118 C262 124 276 152 272 178";

const FORM = {
    'iː': [280, 2250, 2900], 'ɪ': [370, 2050, 2600], 'e': [550, 1850, 2500], 'æ': [700, 1550, 2450], 'ʌ': [640, 1200, 2400], 'ɑː': [680, 1050, 2500],
    'ɒ': [560, 850, 2450], 'ɔː': [450, 750, 2400], 'ʊ': [400, 950, 2300], 'uː': [300, 850, 2250], 'ɜː': [500, 1400, 2450], 'ə': [500, 1450, 2450],
    'a': [720, 1300, 2500],
};
const SCHWA = FORM['ə'];
const synth = {ctx: null, noise: null};
const ctx = () => {
    if (!synth.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        synth.ctx = new AC();
        const n = synth.ctx.createBuffer(1, synth.ctx.sampleRate * 2, synth.ctx.sampleRate), d = n.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        synth.noise = n;
    }
    if (synth.ctx.state === "suspended") synth.ctx.resume();
    return synth.ctx;
};
const env = (g, t0, dur, a = .03, r = .06, peak = 1) => {
    const p = g.gain;
    p.setValueAtTime(0, t0);
    p.linearRampToValueAtTime(peak, t0 + a);
    p.setValueAtTime(peak, Math.max(t0 + a, t0 + dur - r));
    p.linearRampToValueAtTime(0, t0 + dur);
};
const voice = (c, t0, dur, f, opt = {}) => {
    const osc = c.createOscillator();
    osc.type = "sawtooth";
    const pitch = opt.pitch || 125;
    osc.frequency.setValueAtTime(pitch, t0);
    osc.frequency.linearRampToValueAtTime(pitch * .86, t0 + dur);
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = opt.lowpass || 3600;
    lp.Q.value = .5;
    const master = c.createGain();
    env(master, t0, dur, opt.a ?? .04, opt.r ?? .08, (opt.gain ?? 1) * .9);
    osc.connect(lp);
    const from = f.from || f, to = f.to || f, at = f.at ?? 0;
    const fg = opt.fgains || [1, .55, .3];
    from.forEach((F, i) => {
        const bp = c.createBiquadFilter();
        bp.type = "bandpass";
        bp.Q.value = [6, 8, 7][i];
        bp.frequency.setValueAtTime(F, t0);
        if (to !== from) {
            bp.frequency.setValueAtTime(F, t0 + dur * at);
            bp.frequency.linearRampToValueAtTime(to[i], t0 + dur * Math.min(1, at + .5));
        }
        const g = c.createGain();
        g.gain.value = fg[i] * 3.2;
        lp.connect(bp);
        bp.connect(g);
        g.connect(master);
    });
    master.connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + .02);
};
const noise = (c, t0, dur, center, q, gain, opt = {}) => {
    const src = c.createBufferSource();
    src.buffer = synth.noise;
    src.loop = true;
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = center;
    bp.Q.value = q;
    const hp = c.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = opt.hp || 800;
    const g = c.createGain();
    env(g, t0, dur, opt.a ?? .02, opt.r ?? .04, gain);
    src.connect(hp);
    hp.connect(bp);
    bp.connect(g);
    g.connect(c.destination);
    src.start(t0);
    src.stop(t0 + dur + .02);
};
const breath = (c, t0, dur, form, gain) => {
    const src = c.createBufferSource();
    src.buffer = synth.noise;
    src.loop = true;
    const master = c.createGain();
    env(master, t0, dur, .03, .06, gain);
    form.forEach((F, i) => {
        const bp = c.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = F;
        bp.Q.value = 6;
        const g = c.createGain();
        g.gain.value = [1, .7, .4][i] * 2;
        src.connect(bp);
        bp.connect(g);
        g.connect(master);
    });
    master.connect(c.destination);
    src.start(t0);
    src.stop(t0 + dur + .02);
};
const FRIC = {s: [6800, .9, .35], z: [6800, .9, .25], 'ʃ': [3000, 1.2, .4], 'ʒ': [3000, 1.2, .3], f: [4500, .35, .14], v: [4500, .35, .09], 'θ': [5800, .45, .13], 'ð': [5800, .45, .09]};
const BURST = {p: [900, .7], b: [900, .7], t: [4200, .8], d: [4200, .8], k: [2000, 1.2], g: [2000, 1.2]};
const LOCUS = {p: [300, 900, 2300], b: [300, 900, 2300], t: [350, 1700, 2600], d: [350, 1700, 2600], k: [300, 2000, 2400], g: [300, 2000, 2400]};
const NASAL = {m: [250, 1000, 2200], n: [250, 1500, 2500], 'ŋ': [250, 2100, 2700]};
const APPROX = {l: [350, 1100, 2800], r: [350, 1100, 1450], w: [300, 650, 2200], j: [280, 2300, 3000]};
const playSound = (snd, slow = false) => {
    const c = ctx(), t0 = c.currentTime + .05, S = slow ? 2 : 1;
    const cues = [];
    const shape = shapeOf(snd);
    let dur;
    if (snd.cat === "v") {
        dur = (snd.long ? .75 : .38) * S;
        voice(c, t0, dur, FORM[snd.s]);
        cues.push([0, shape]);
    } else if (snd.cat === "d") {
        dur = .8 * S;
        const f = FORM[snd.from.s] || FORM.a;
        voice(c, t0, dur, {from: f, to: FORM[snd.to.s], at: .4});
        cues.push([0, shape], [dur * .4, vowelShape(snd.to)]);
    } else if (snd.manner === "fricative") {
        dur = (snd.s === "h" ? .35 : .55) * S;
        cues.push([0, shape]);
        if (snd.s === "h") breath(c, t0, dur, SCHWA, .5);
        else {
            const [F, Q, G] = FRIC[snd.s];
            noise(c, t0, dur, F, Q, G, {hp: ["f", "v", "θ", "ð"].includes(snd.s) ? 1500 : 2500});
            if (snd.voiced) voice(c, t0, dur, [250, 1100, 2200], {gain: .45, fgains: [1, .2, .1], lowpass: 1200});
        }
    } else if (snd.manner === "plosive") {
        const hold = .12 * S, [F, Q] = BURST[snd.s];
        cues.push([0, shape]);
        if (snd.voiced) voice(c, t0, hold, [200, 900, 2200], {gain: .35, fgains: [1, .15, .05], lowpass: 700, a: .03, r: .02});
        const tb = t0 + hold;
        noise(c, tb, .022, F, Q, snd.voiced ? .5 : .7, {a: .003, r: .012, hp: 500});
        const asp = snd.voiced ? .01 : .07 * S;
        if (!snd.voiced) breath(c, tb + .015, asp, SCHWA, .35);
        const tv = tb + .02 + asp, vd = .16 * S;
        voice(c, tv, vd, {from: LOCUS[snd.s], to: SCHWA, at: 0}, {gain: .8, a: .01, r: .08});
        cues.push([hold, releaseOf(shape, snd)], [hold + .03 + asp, vowelShape(vow('ə'))]);
        dur = hold + .02 + asp + vd;
    } else if (snd.manner === "affricate") {
        const hold = .1 * S;
        cues.push([0, shape]);
        if (snd.voiced) voice(c, t0, hold, [200, 900, 2200], {gain: .3, fgains: [1, .15, .05], lowpass: 700});
        noise(c, t0 + hold, .02, 4200, .8, .6, {a: .003, r: .01});
        const fd = .28 * S;
        noise(c, t0 + hold + .015, fd, 3000, 1.2, snd.voiced ? .3 : .4, {hp: 2000, a: .01});
        if (snd.voiced) voice(c, t0 + hold + .015, fd, [250, 1100, 2200], {gain: .4, fgains: [1, .2, .1], lowpass: 1200});
        cues.push([hold, releaseOf(shape, snd)]);
        dur = hold + .015 + fd;
    } else if (snd.manner === "nasal") {
        dur = .55 * S;
        voice(c, t0, dur, NASAL[snd.s], {gain: .8, fgains: [1, .18, .1], lowpass: 2800});
        cues.push([0, shape]);
    } else {
        dur = .5 * S;
        voice(c, t0, dur, {from: APPROX[snd.s], to: SCHWA, at: .35}, {gain: .9});
        cues.push([0, shape], [dur * .4, vowelShape(vow('ə'))]);
    }
    return {cues, dur};
};

const frontParams = snd => {
    if (snd.cat === "v" || snd.cat === "d") {
        const v = snd.cat === "v" ? snd : snd.from;
        return {open: 1 - v.h, spread: v.f * (1 - v.r), round: v.r, mode: "open", tongue: v.h < .3 ? "low" : "none"};
    }
    const c = snd, o = {open: .2, spread: .3, round: 0, mode: "open", tongue: "none"};
    switch (c.place) {
        case "bilabial":
            if (c.manner === "approximant") {
                o.round = 1;
                o.open = .25;
            } else o.mode = "closed";
            break;
        case "labiodental":
            o.mode = "tuck";
            break;
        case "dental":
            o.open = .3;
            o.tongue = "between";
            break;
        case "alveolar":
            o.open = c.manner === "approximant" ? .35 : .2;
            o.tongue = c.manner === "fricative" ? "none" : "tipUp";
            o.spread = .4;
            break;
        case "postalveolar":
            o.round = c.manner === "approximant" ? .45 : .4;
            o.open = .3;
            break;
        case "palatal":
            o.spread = .8;
            o.open = .15;
            break;
        case "velar":
            o.open = .3;
            o.spread = .2;
            break;
        case "glottal":
            o.open = .45;
            o.spread = .2;
            break;
        default:
    }
    return o;
};
const jawWord = o => o < .25 ? "almost closed, teeth nearly together" : o < .55 ? "half open, about one finger wide" : "wide open, about two fingers";
const lipsSentence = fp => {
    if (fp.mode === "closed") return "Close your lips completely and keep them together.";
    if (fp.mode === "tuck") return "Rest your lower lip lightly against the edge of your upper front teeth.";
    if (fp.round > .7) return "Round your lips into a small tight circle and push them forward, as if to whistle.";
    if (fp.round > .3) return 'Round your lips loosely, a relaxed "o".';
    if (fp.spread > .7) return "Spread your lips wide, like a smile; you should see your upper teeth.";
    return "Keep your lips relaxed and neutral, not smiling, not rounded.";
};
const PLACE_STEP = {
    bilabial: "Your lips do the work; the tongue rests flat in the middle of the mouth.",
    labiodental: "Your lower lip and upper teeth do the work; the tongue rests flat.",
    dental: "Push the tip of your tongue forward until it touches the back of your upper front teeth, or peeks out between the teeth.",
    alveolar: "Touch the tip of your tongue to the bumpy ridge just behind your upper front teeth (not the teeth themselves).",
    postalveolar: "Lift the front part of your tongue toward the roof of the mouth a little further back than the ridge, tip slightly curled up.",
    palatal: "Raise the front of your tongue high toward the hard roof of the mouth, the sides pressed against your upper side teeth.",
    velar: "Lift the back of your tongue up until it touches the soft part of the roof of the mouth, far back. The tip stays down.",
    glottal: "Keep the tongue in the position of the next vowel; nothing in the mouth moves.",
};
const MANNER_STEP = {
    plosive: "Block the air completely, let pressure build for a moment, then let it go in one burst.",
    fricative: "Do not block the air fully; leave a narrow gap and push air through it so it hisses.",
    affricate: "Block the air first, then release it straight into a hiss. One quick movement.",
    nasal: "Keep the mouth blocked and let the sound come out through your nose. You can hum it for as long as you like.",
    approximant: "Bring the parts close but leave a gap wide enough that the air makes no hiss. Then slide into the next vowel.",
};
const tongueVowel = v => {
    const part = v.f > .7 ? "front" : v.f > .3 ? "middle" : "back";
    const hgt = v.h > .7 ? "high, close to the roof of the mouth" : v.h > .4 ? "at mid height" : "low and flat";
    const tip = v.f > .7 ? "the tip rests behind your lower front teeth" : "the tip stays low and pulled back";
    return `Put the ${part} of your tongue ${hgt}; ${tip}.`;
};
const glideTo = (from, to) => {
    const bits = [];
    if (to.h > from.h + .2) bits.push("close the jaw");
    if (to.h < from.h - .2) bits.push("open the jaw");
    if (to.f > from.f + .2) bits.push("move the tongue up and forward");
    if (to.f < from.f - .2) bits.push("pull the tongue back");
    if (to.r > from.r + .3) bits.push("round the lips");
    if (to.r < from.r - .3) bits.push("unround the lips");
    if (to.s === "ə") bits.push("relax everything toward the centre");
    return bits.join(", ");
};
const stepsFor = (snd, fp) => {
    const st = [`<b>Jaw:</b> ${jawWord(fp.open)}.`, `<b>Lips:</b> ${lipsSentence(fp)}`];
    if (snd.cat === "v") st.push(`<b>Tongue:</b> ${tongueVowel(snd)}`);
    else if (snd.cat === "d") st.push(`<b>Tongue:</b> start as for <span class="ipa">/${snd.from.s}/</span>. ${tongueVowel(snd.from)}`);
    else st.push(`<b>Tongue:</b> ${PLACE_STEP[snd.place]} ${MANNER_STEP[snd.manner]}`);
    if (snd.cat === "c" && !snd.voiced) st.push("<b>Air and voice:</b> breath only, no voice. Put a finger on your throat: it must stay still." + (snd.manner === "plosive" ? " At the start of a word add a puff of air you can feel on your hand." : ""));
    else if (snd.cat === "c") st.push("<b>Air and voice:</b> switch your voice on. Put a finger on your throat and feel it buzz for the whole sound.");
    else st.push(`<b>Air and voice:</b> voice on, throat buzzing. ${snd.cat === "v" && snd.long ? "Hold the sound for a full second without moving anything." : snd.cat === "v" ? "Keep it short; do not let the shape change." : "The first part is longer and louder."}`);
    if (snd.cat === "d") st.push(`<b>Glide:</b> while the voice is still on, ${glideTo(snd.from, snd.to)} toward <span class="ipa">/${snd.to.s}/</span>. Finish there, quietly.`);
    return st;
};
const mirrorFor = (snd, fp) => {
    if (fp.mode === "closed") return "Lips shut. For /m/ you can hum and feel your nose vibrate.";
    if (fp.mode === "tuck") return "Your upper teeth resting on the inside of your lower lip. Only a small gap.";
    if (fp.tongue === "between") return "The tip of your tongue visible between your teeth. If you cannot see it, push it further forward.";
    if (fp.tongue === "tipUp") return "Mouth slightly open, tongue tip up behind the top teeth. You may see the underside of the tongue.";
    if (fp.round > .7) return "A small round hole, lips pushed forward. Cheeks slightly tense.";
    if (fp.spread > .7 && fp.open < .3) return "A wide smile with the teeth almost touching. Corners of the mouth pulled back.";
    if (fp.open > .6) return "Mouth wide open, tongue low and flat so you can see far in.";
    if (fp.round > .3) return "Lips loosely rounded, a soft oval opening.";
    return "A relaxed, neutral mouth; nothing tense.";
};

const clean = w => w.replace(/\[|\]/g, "");
const WIPA = {'sheep': 'ʃiːp', 'sea': 'siː', 'key': 'kiː', 'ship': 'ʃɪp', 'big': 'bɪɡ', 'it': 'ɪt', 'foot': 'fʊt', 'put': 'pʊt', 'book': 'bʊk', 'food': 'fuːd', 'blue': 'bluː', 'two': 'tuː', 'bed': 'bed', 'head': 'hed', 'said': 'sed', 'about': 'əˈbaʊt', 'teacher': 'ˈtiːtʃə', 'common': 'ˈkɒmən', 'bird': 'bɜːd', 'word': 'wɜːd', 'nurse': 'nɜːs', 'thought': 'θɔːt', 'four': 'fɔː', 'door': 'dɔː', 'cat': 'kæt', 'bad': 'bæd', 'hand': 'hænd', 'cup': 'kʌp', 'love': 'lʌv', 'bus': 'bʌs', 'car': 'kɑː', 'father': 'ˈfɑːðə', 'heart': 'hɑːt', 'hot': 'hɒt', 'want': 'wɒnt', 'on': 'ɒn', 'face': 'feɪs', 'day': 'deɪ', 'rain': 'reɪn', 'price': 'praɪs', 'my': 'maɪ', 'time': 'taɪm', 'choice': 'tʃɔɪs', 'boy': 'bɔɪ', 'noise': 'nɔɪz', 'goat': 'ɡəʊt', 'show': 'ʃəʊ', 'no': 'nəʊ', 'mouth': 'maʊθ', 'now': 'naʊ', 'house': 'haʊs', 'near': 'nɪə', 'here': 'hɪə', 'beer': 'bɪə', 'square': 'skweə', 'hair': 'heə', 'there': 'ðeə', 'cure': 'kjʊə', 'tour': 'tʊə', 'pure': 'pjʊə', 'pen': 'pen', 'happy': 'ˈhæpi', 'stop': 'stɒp', 'rabbit': 'ˈræbɪt', 'job': 'dʒɒb', 'tea': 'tiː', 'better': 'ˈbetə', 'dog': 'dɒɡ', 'ladder': 'ˈlædə', 'back': 'bæk', 'get': 'ɡet', 'bigger': 'ˈbɪɡə', 'bag': 'bæɡ', 'fish': 'fɪʃ', 'coffee': 'ˈkɒfi', 'life': 'laɪf', 'very': 'ˈveri', 'never': 'ˈnevə', 'five': 'faɪv', 'think': 'θɪŋk', 'bath': 'bɑːθ', 'author': 'ˈɔːθə', 'this': 'ðɪs', 'mother': 'ˈmʌðə', 'breathe': 'briːð', 'see': 'siː', 'miss': 'mɪs', 'zoo': 'zuː', 'lazy': 'ˈleɪzi', 'dogs': 'dɒɡz', 'she': 'ʃiː', 'nation': 'ˈneɪʃn', 'measure': 'ˈmeʒə', 'vision': 'ˈvɪʒn', 'beige': 'beɪʒ', 'hat': 'hæt', 'ahead': 'əˈhed', 'who': 'huː', 'chair': 'tʃeə', 'match': 'mætʃ', 'judge': 'dʒʌdʒ', 'age': 'eɪdʒ', 'bridge': 'brɪdʒ', 'man': 'mæn', 'summer': 'ˈsʌmə', 'dinner': 'ˈdɪnə', 'sun': 'sʌn', 'sing': 'sɪŋ', 'long': 'lɒŋ', 'light': 'laɪt', 'yellow': 'ˈjeləʊ', 'feel': 'fiːl', 'red': 'red', 'sorry': 'ˈsɒri', 'carry': 'ˈkæri', 'wet': 'wet', 'away': 'əˈweɪ', 'wine': 'waɪn', 'yes': 'jes', 'use': 'juːz', 'pull': 'pʊl', 'pool': 'puːl', 'cap': 'kæp', 'hut': 'hʌt', 'cot': 'kɒt', 'caught': 'kɔːt', 'board': 'bɔːd', 'forward': 'ˈfɔːwəd', 'foreword': 'ˈfɔːwɜːd', 'pin': 'pɪn', 'bin': 'bɪn', 'ten': 'ten', 'den': 'den', 'coat': 'kəʊt', 'fan': 'fæn', 'van': 'væn', 'vine': 'vaɪn', 'sink': 'sɪŋk', 'then': 'ðen', 'sue': 'suː', 'sip': 'sɪp', 'pleasure': 'ˈpleʒə', 'pledger': 'ˈpledʒə', 'at': 'æt', 'chip': 'tʃɪp', 'cheap': 'tʃiːp', 'some': 'sʌm', 'sin': 'sɪn', 'right': 'raɪt'};
const ipaOf = w => WIPA[clean(w).toLowerCase()];
const tr = w => ipaOf(w) ? `<small class="tr ipa">/${ipaOf(w)}/</small>` : "";
const hl = w => w.replace(/\[(.+?)\]/g, "<mark>$1</mark>");

const Html = ({tag: Tag = "span", html, ...rest}) => <Tag {...rest} dangerouslySetInnerHTML={{__html: html}}/>;

const dAttr = d => ({d, style: {d: `path("${d}")`}});
const Mouth = ({shape: p}) => {
    const lp = lipPaths(p);
    return (
        <svg className="mouth" viewBox="30 40 340 300" role="img" aria-label="Side view of the mouth: lips and tongue positions">
            <path className="skin" d="M215 18 C150 22 112 58 108 96 C100 106 82 112 70 124 C64 130 68 140 82 140 C92 141 95 146 94 152"/>
            <path className="skin" d="M300 122 C308 180 310 250 306 318"/>
            <path className="bone" d="M116 150 C140 132 170 120 200 118 L238 118"/>
            <path className="velum" {...dAttr(p.velum === "down" ? VELUM_DOWN : VELUM_UP)}/>
            <path className="tooth" d="M106 150 L116 150 L116 172 Q111 178 106 172 Z"/>
            <path className="lipline" {...dAttr(lp.up)}/>
            <g className="jaw" style={{transform: `translateY(${p.jaw}px)`}}>
                <path className="tooth" d="M106 202 L116 202 L116 182 Q111 176 106 182 Z"/>
                <path className="lipline" {...dAttr(lp.lo)}/>
                <path className="skin" d="M96 208 C108 212 106 226 118 238 C140 260 190 274 240 286 C262 291 276 299 284 310"/>
            </g>
            <path className="tongue" {...dAttr(tonguePath(p))}/>
            <circle className={p.spot ? "spot on" : "spot"} cx={p.spot ? p.spot[0] : 127} cy={p.spot ? p.spot[1] : 152} r="14"/>
            <text x="54" y="146">lips</text>
            <text x="134" y="104">roof of mouth</text>
            <text x="248" y="104">soft palate</text>
            <text x="200" y="262">tongue</text>
        </svg>
    );
};

const Key = ({snd, cls, active, onClick, style}) => (
    <button type="button" className={`key ${cls}`} aria-pressed={active} onClick={onClick} style={style}>
        <span className="ipa">{snd.s}</span>
        <span className="ex">{clean(snd.words[0])}</span>
    </button>
);

export default function SoundsPanel() {
    const [current, setCurrent] = useState(VOWELS[0]);
    const [shape, setShape] = useState(() => shapeOf(VOWELS[0]));
    const [accent, setAccent] = useState("en-GB");
    const [voiceIdx, setVoiceIdx] = useState("");
    const [rate, setRate] = useState(0.85);
    const [voices, setVoices] = useState([]);
    const timers = useRef([]);
    const detailRef = useRef(null);

    useEffect(() => {
        if (!("speechSynthesis" in window)) return;
        const load = () => setVoices(speechSynthesis.getVoices().filter(v => /^en([-_]|$)/i.test(v.lang)));
        load();
        speechSynthesis.addEventListener("voiceschanged", load);
        return () => {
            speechSynthesis.removeEventListener("voiceschanged", load);
            speechSynthesis.cancel();
            timers.current.forEach(clearTimeout);
        };
    }, []);

    const clearTimers = () => {
        timers.current.forEach(clearTimeout);
        timers.current = [];
    };
    const pickVoice = () => {
        if (voiceIdx !== "" && voices[+voiceIdx]) return voices[+voiceIdx];
        const lang = accent.toLowerCase();
        const score = v => (/google|natural|online|neural|premium|enhanced/i.test(v.name) ? 2 : 0) + (v.localService ? 0 : 1);
        return voices.filter(v => v.lang.replace("_", "-").toLowerCase() === lang).sort((a, b) => score(b) - score(a))[0] || voices[0] || null;
    };
    const speak = (text, r = rate) => {
        if (!("speechSynthesis" in window)) return alert("This browser has no speech engine.");
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        const v = pickVoice();
        if (v) u.voice = v;
        u.lang = v ? v.lang : accent;
        u.rate = r;
        u.pitch = 1;
        speechSynthesis.speak(u);
    };
    const sayWord = w => speak(clean(w) + ".", Math.max(rate, .9));
    const play = (snd, slow) => {
        const {cues, dur} = playSound(snd, slow);
        clearTimers();
        setShape(REST);
        cues.forEach(([t, sh]) => timers.current.push(setTimeout(() => setShape(sh), 80 + t * 1000)));
        timers.current.push(setTimeout(() => setShape(REST), 80 + dur * 1000 + 120));
        timers.current.push(setTimeout(() => setShape(shapeOf(snd)), 80 + dur * 1000 + 800));
    };
    const select = (snd, scroll) => {
        window.speechSynthesis?.cancel();
        clearTimers();
        setCurrent(snd);
        setShape(shapeOf(snd));
        if (scroll && window.innerWidth < 900) detailRef.current?.scrollIntoView({behavior: "smooth", block: "start"});
    };
    const keyProps = (snd, cls) => ({
        snd, cls, active: current.s === snd.s, onClick: () => {
            select(snd, true);
            play(snd);
        }
    });

    const fp = frontParams(current);
    const steps = stepsFor(current, fp);
    const pair = current.contrast?.pair;
    const other = current.contrast?.s ? ALL.find(x => x.s === current.contrast.s) : null;

    return (
        <div className="sp">
            <style>{CSS}</style>
            <div className="topbar">
                <div className="voicebox">
                    <div className="seg" role="group" aria-label="Accent">
                        {[["en-GB", "British"], ["en-US", "American"]].map(([code, label]) => (
                            <button key={code} type="button" aria-pressed={accent === code} onClick={() => {
                                setAccent(code);
                                setVoiceIdx("");
                            }}>{label}</button>
                        ))}
                    </div>
                    <label>Voice <select value={voiceIdx} onChange={e => setVoiceIdx(e.target.value)}>
                        <option value="">Auto for accent</option>
                        {voices.map((v, i) => <option key={i} value={i}>{v.name} ({v.lang})</option>)}
                    </select></label>
                    <label>Speed <input type="range" min="0.5" max="1.2" step="0.05" value={rate} onChange={e => setRate(+e.target.value)}/> <span>{rate.toFixed(2)}</span></label>
                </div>
            </div>

            <div className="body">
                <div className="sounds">
                    <div className="chart">
                        <h2>Vowels <span>tongue position: front on the left, back on the right; high at the top, low at the bottom</span></h2>
                        <div className="vgrid">
                            {VOWELS.map(v => <Key key={v.s} {...keyProps(v, "v")} style={{gridColumn: v.col, gridRow: v.row}}/>)}
                            <div className="axis" style={{gridRow: 5}}><span>front (lips spread)</span><span>back (lips rounded)</span></div>
                        </div>
                        <h2>Diphthongs <span>two vowels glided together</span></h2>
                        <div className="dgrid">
                            {DIPHS.map(d => <Key key={d.s} {...keyProps(d, "d")}/>)}
                        </div>
                        <h2>Consonants <span>columns: where the air is blocked, from lips to throat</span></h2>
                        <table className="ctable">
                            <thead>
                            <tr>
                                <th className="row"/>
                                {PLACES.map(p => <th key={p}>{PLACE[p].label}</th>)}
                            </tr>
                            </thead>
                            <tbody>
                            {MANNERS.map(m => (
                                <tr key={m}>
                                    <th className="row">{m}</th>
                                    {PLACES.map(p => (
                                        <td key={p}>
                                            <div className="pair">
                                                {CONS.filter(c => c.place === p && c.manner === m).map(c => <Key key={c.s} {...keyProps(c, "c")}/>)}
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                            </tbody>
                        </table>
                        <p className="legend">In each pair the left sound is voiceless (breath only) and the right is voiced (vocal folds vibrate). Put a finger on your throat: you should feel <span className="ipa">/z/</span> buzz and <span className="ipa">/s/</span> stay silent.</p>
                    </div>

                    <div className="detail" ref={detailRef}>
                        <div className="head">
                            <div className={`sym ipa ${current.cat}`}>{current.s}</div>
                            <div className="name">
                                {current.name}
                                <small>as in {current.words.map((x, i) => (
                                    <React.Fragment key={x}>{i > 0 && ", "}<em>{clean(x)}</em> <span className="ipa">/{ipaOf(x) || "?"}/</span></React.Fragment>
                                ))}</small>
                            </div>
                        </div>
                        <Mouth shape={shape}/>
                        <ol className="do">
                            {steps.map((x, i) => <li key={i}><Html html={x}/></li>)}
                        </ol>
                        <p className="mirror"><b>In the mirror you should see:</b> {mirrorFor(current, fp)}</p>
                        <Html tag="p" className="how" html={"In short: " + current.how}/>
                        <div className="words">
                            <button type="button" className="wbtn primary" onClick={() => play(current)}><span className="play"/>Play <span className="ipa">/{current.s}/</span></button>
                            <button type="button" className="wbtn" onClick={() => play(current, true)}><span className="play"/>Slow</button>
                            <span className="inword">in a word:</span>
                            {current.words.map(x => (
                                <button key={x} type="button" className="wbtn small" onClick={() => sayWord(x)}><span className="play"/><Html html={hl(x) + tr(x)}/></button>
                            ))}
                        </div>
                        {pair && (
                            <div className="contrast">
                                {other ? <>Contrast with <button type="button" className="wbtn" onClick={() => select(other, false)}><span className="ipa">/{current.contrast.s}/</span></button></> : "Compare: "}
                                <button type="button" className="wbtn" onClick={() => speak(pair.join(". ") + ".", Math.max(rate, .9))}>
                                    <span className="play"/><Html html={pair[0] + tr(pair[0])}/><span className="dash">–</span><Html html={pair[1] + tr(pair[1])}/>
                                </button>
                            </div>
                        )}
                        <Html tag="div" className="tip" html={"<b>Watch out.</b> " + current.tip}/>
                        {current.us && <Html tag="p" className="note" html={current.us}/>}
                    </div>
                </div>
            </div>
        </div>
    );
}
