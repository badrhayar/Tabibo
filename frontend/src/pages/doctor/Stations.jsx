import { useState, useEffect } from 'react';
import { BTN_GREEN } from '../../shared.jsx';
import { useViewport } from '../../hooks/useViewport';
import { STATION_KINDS, kindOf, loadStations, saveStations, defaultStations } from '../../lib/stations';
import { saveDoctorStations } from '../../lib/api';

// ─────────────────────────────────────────────────────────────────────────────
// Postes de soins — le médecin décrit ici la géographie de son cabinet :
// l'accueil, chaque praticien, la salle de soins, le laboratoire, l'imagerie…
// Ces postes deviennent les colonnes du navigateur patients, la liste proposée
// à la prise de rendez-vous (côté cabinet ET côté patient), et l'endroit où le
// patient est envoyé quand il arrive.
// ─────────────────────────────────────────────────────────────────────────────

const TEAL = '#0F6E56';
const DARK = '#15314A';
const MUTED = '#6B7B76';
const BORDER = '#E8EFEB';
const BG = '#F5F9F7';
const SHADOW = '0 1px 3px rgba(13,43,30,0.05), 0 10px 26px -16px rgba(13,43,30,0.18)';
const card = { background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, boxShadow: SHADOW };
const inp = { padding: '10px 12px', fontSize: 13.5, border: `1px solid #DCE6E1`, borderRadius: 10, color: DARK, background: '#fff', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' };

const I = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
const IC = {
  up:    <svg {...I}><path d="M12 19V5M5 12l7-7 7 7" /></svg>,
  down:  <svg {...I}><path d="M12 5v14M19 12l-7 7-7-7" /></svg>,
  trash: <svg {...I}><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>,
  plus:  <svg {...I}><path d="M12 5v14M5 12h14" /></svg>,
};

export default function Stations({ state, setState, go }) {
  const { isMobile } = useViewport();
  const doctorId = state?.myDoctor?.id;
  const me = state?.myDoctor?.name || state?.appUser?.full_name || 'Médecin';

  const [list, setList] = useState(() => loadStations(state, me));
  const [name, setName] = useState('');
  const [kind, setKind] = useState('doctor');
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => { setList(loadStations(state, me)); /* eslint-disable-next-line */ }, [state?.myDoctor?.id]);

  const patch = (next) => { setList(next); setDirty(true); };

  const add = () => {
    const n = name.trim();
    if (!n) return;
    patch([...list, { id: `st_${Date.now()}`, name: n, kind }]);
    setName('');
  };
  const rename = (id, v) => patch(list.map((s) => (s.id === id ? { ...s, name: v } : s)));
  const setKindOf = (id, v) => patch(list.map((s) => (s.id === id ? { ...s, kind: v } : s)));
  const move = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    patch(next);
  };
  const remove = (id) => {
    if (list.length <= 1) { setState({ toast: 'Gardez au moins un poste de soins.', toastShow: true }); return; }
    patch(list.filter((s) => s.id !== id));
  };

  // Enregistrement : la base d'abord (le patient doit voir les postes lors de
  // sa réservation), le cache local ensuite pour la démo et le hors-ligne.
  const save = async () => {
    const clean = list.filter((s) => (s.name || '').trim());
    if (clean.length === 0) { setState({ toast: 'Ajoutez au moins un poste.', toastShow: true }); return; }
    setBusy(true);
    try {
      if (doctorId) {
        const saved = await saveDoctorStations(doctorId, clean);
        setState({ myDoctor: { ...state.myDoctor, stations: saved } });
      }
      saveStations(state, clean);
      setList(clean);
      setDirty(false);
      setState({ toast: 'Postes de soins enregistrés ✓', toastShow: true });
    } catch (e) {
      setState({ toast: 'Enregistrement échoué : ' + (e?.message || 'erreur'), toastShow: true });
    } finally { setBusy(false); }
  };

  return (
    <div style={{ padding: isMobile ? 14 : 32, background: BG, minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: DARK, letterSpacing: '-0.3px' }}>Postes de soins</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13.5, color: MUTED, maxWidth: 760, lineHeight: 1.6 }}>
          Décrivez les postes de votre cabinet : l'accueil, chaque praticien, la salle de soins, le laboratoire, l'imagerie…
          Ils deviennent les colonnes du navigateur patients, et le poste peut être choisi dès la prise de rendez-vous —
          par vous comme par le patient. Ce choix reste facultatif.
        </p>
      </div>

      {/* `stretch` : les deux colonnes s'arrêtent à la même ligne, sinon la carte
          d'aide flotte plus haut ou plus bas que la liste des postes. */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) 320px', gap: 16, alignItems: isMobile ? 'start' : 'stretch' }}>
        {/* Les postes */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: DARK }}>Les postes de mon cabinet</div>
              <div style={{ fontSize: 12.5, color: MUTED, marginTop: 1 }}>{list.length} poste{list.length > 1 ? 's' : ''} · l'ordre est celui du navigateur</div>
            </div>
            <button onClick={() => patch(defaultStations(me))}
              style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 9, padding: '8px 13px', fontSize: 12.5, fontWeight: 600, color: MUTED, cursor: 'pointer', fontFamily: 'inherit' }}>
              Réinitialiser
            </button>
          </div>

          {list.map((s, i) => {
            const k = kindOf(s.kind);
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < list.length - 1 ? `1px solid #F2F6F4` : 'none', flexWrap: 'wrap' }}>
                <span style={{ width: 34, height: 34, borderRadius: 10, background: k.bg, color: k.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, fontWeight: 800, flexShrink: 0 }}>
                  {(s.name || '?').slice(0, 2).toUpperCase()}
                </span>
                <input value={s.name} onChange={(e) => rename(s.id, e.target.value)} placeholder="Nom du poste"
                  style={{ ...inp, flex: 1, minWidth: 150 }} />
                <select value={s.kind} onChange={(e) => setKindOf(s.id, e.target.value)} style={{ ...inp, cursor: 'pointer', minWidth: 190 }}>
                  {STATION_KINDS.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
                </select>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Monter"
                    style={{ width: 32, height: 32, borderRadius: 9, border: `1px solid ${BORDER}`, background: '#fff', color: i === 0 ? '#C9D8D1' : MUTED, cursor: i === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{IC.up}</button>
                  <button onClick={() => move(i, 1)} disabled={i === list.length - 1} aria-label="Descendre"
                    style={{ width: 32, height: 32, borderRadius: 9, border: `1px solid ${BORDER}`, background: '#fff', color: i === list.length - 1 ? '#C9D8D1' : MUTED, cursor: i === list.length - 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{IC.down}</button>
                  <button onClick={() => remove(s.id)} aria-label="Supprimer"
                    style={{ width: 32, height: 32, borderRadius: 9, border: `1px solid ${BORDER}`, background: '#fff', color: '#C2466A', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{IC.trash}</button>
                </div>
              </div>
            );
          })}

          {/* Ajouter */}
          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()}
              placeholder="Ex. Dr Alami · Laboratoire · Échographie" style={{ ...inp, flex: 1, minWidth: 180 }} />
            <select value={kind} onChange={(e) => setKind(e.target.value)} style={{ ...inp, cursor: 'pointer', minWidth: 190 }}>
              {STATION_KINDS.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
            </select>
            <button onClick={add} disabled={!name.trim()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: name.trim() ? BTN_GREEN : '#EAF0EC', color: name.trim() ? '#fff' : MUTED, border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: name.trim() ? 'pointer' : 'default', fontFamily: 'inherit' }}>
              {IC.plus} Ajouter
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
            <button onClick={save} disabled={busy || !dirty}
              style={{ background: dirty && !busy ? BTN_GREEN : '#EAF0EC', color: dirty && !busy ? '#fff' : MUTED, border: 'none', borderRadius: 10, padding: '11px 20px', fontSize: 13.5, fontWeight: 700, cursor: dirty && !busy ? 'pointer' : 'default', fontFamily: 'inherit' }}>
              {busy ? 'Enregistrement…' : 'Enregistrer les postes'}
            </button>
            {!doctorId && <span style={{ fontSize: 12.5, color: MUTED }}>En démonstration, les postes restent sur cet appareil.</span>}
            {dirty && doctorId && <span style={{ fontSize: 12.5, color: '#9A6510' }}>Modifications non enregistrées.</span>}
          </div>
        </div>

        {/* Aide */}
        <div style={{ ...card, background: '#F6FAF8' }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: DARK, marginBottom: 10 }}>À quoi servent les postes</div>
          {[
            ['Navigateur patients', 'Chaque poste devient une colonne : vous voyez qui est chez quel praticien, au labo ou en salle de soins.'],
            ['Prise de rendez-vous', 'Vous choisissez le poste en créant le rendez-vous ; le patient le retrouve à son arrivée.'],
            ['Réservation en ligne', 'Le patient peut choisir le poste sur votre page publique — sans que ce soit obligatoire.'],
            ['Cabinet de groupe', 'Un poste « Médecin » par praticien : chacun retrouve ses patients dans sa colonne.'],
          ].map(([t, d], i, a) => (
            <div key={t} style={{ padding: '9px 0', borderBottom: i < a.length - 1 ? '1px solid #E6EFEA' : 'none' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: DARK }}>{t}</div>
              <div style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.55, marginTop: 2 }}>{d}</div>
            </div>
          ))}
          <button onClick={() => go('dnav')}
            style={{ width: '100%', marginTop: 14, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '10px 0', fontSize: 12.5, fontWeight: 700, color: TEAL, cursor: 'pointer', fontFamily: 'inherit' }}>
            Ouvrir le navigateur patients
          </button>
        </div>
      </div>
    </div>
  );
}
