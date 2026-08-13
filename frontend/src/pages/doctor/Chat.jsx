import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useViewport } from '../../hooks/useViewport';
import { fetchConversations, fetchMessages, sendMessage, getOrCreateConversation, deleteConversation, subscribeToConversation, subscribeToInbox, uploadChatImage, isImageMessage, dbErrorMessage } from '../../lib/api';
import { greenBtn, greenBtnBusy, BTN_GREEN } from '../../shared.jsx';
import { SEC, ICONS } from '../../components/SectionKit.jsx';
import ChatImage from '../../components/ChatImage';

const PRIMARY = '#16A06A';
const DARK = '#15314A';
const BG = '#F5F9F7';
const BORDER = '#E8EFEB';
const MUTED = '#6B7B76';
const BORDER_STRONG = '#D5E5DD';
const HEADER_BG = '#EDF5F0';

const TINTS = [
  ['#E7F6EE','#138257'],
  ['#E8F1FC','#3B6FB0'],
  ['#FEF3DC','#C28A1B'],
  ['#FCE7EE','#C2466A'],
  ['#EFEAFB','#6B57A6'],
  ['#E4F2F4','#1B7E86'],
];

function initials(name) {
  if (!name) return '?';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0][0].toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}
const fmtTime = (iso) => {
  try {
    const d = new Date(iso);
    const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Casablanca' });
    const today = new Date().toDateString() === d.toDateString();
    return today ? `Aujourd'hui ${time}` : `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', timeZone: 'Africa/Casablanca' })} · ${time}`;
  } catch { return ''; }
};

export default function Chat({ state, setState }) {
  const appUser = state?.appUser;
  // Sales demo: no account, so conversations live in state (state.demoChats) and
  // every send/read is local. The viewer "is" the cabinet/doctor here.
  const isDemo = !appUser && !!state?.demoDoctor;
  const isDoctor = appUser?.role === 'doctor' || isDemo;
  const { isMobile } = useViewport();

  // Seed the conversation list from the session cache so returning to Messagerie
  // shows it instantly instead of a blank pane while the fetch runs.
  const [convs, setConvs] = useState(() => state?.chatConvsCache || []);
  const [activeId, setActiveId] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [searchVal, setSearchVal] = useState('');
  const [showNew, setShowNew] = useState(false);   // "Nouvelle conversation" picker
  const [creating, setCreating] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Load conversations for the signed-in user; returns the mapped list.
  const loadConvs = async (autoOpen = true) => {
    if (isDemo) {
      const mapped = (state?.demoChats || []).map((c, i) => ({ id: c.id, ci: i, peer: c.peer, peerId: c.peerId }));
      setConvs(mapped);
      if (autoOpen) setActiveId((prev) => prev || (isMobile ? null : (mapped[0]?.id ?? null)));
      return mapped;
    }
    try {
      const list = await fetchConversations();
      const mapped = list.map((c, i) => ({ id: c.id, ci: i, peer: isDoctor ? c.patientName : c.doctorName, peerId: isDoctor ? c.patientId : c.doctorId }));
      setConvs(mapped);
      setState?.({ chatConvsCache: mapped });
      if (autoOpen) setActiveId((prev) => prev || (isMobile ? null : (mapped[0]?.id ?? null)));
      return mapped;
    } catch (e) { console.warn('[Tabibo] fetchConversations failed', e); return []; }
  };
  useEffect(() => { loadConvs(); }, [isDoctor]);

  // Keep the conversation list fresh: reload when any new message arrives (a
  // patient may have started a brand-new conversation) + a slow poll fallback in
  // case realtime is unavailable.
  useEffect(() => {
    if (isDemo) { loadConvs(false); return undefined; }   // demo: no realtime, state-driven
    const unsub = subscribeToInbox({ onMessage: () => loadConvs(false), onConversation: () => loadConvs(false) });
    const t = setInterval(() => loadConvs(false), 6000);
    return () => { try { unsub(); } catch (e) { /* ignore */ } clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDoctor, isDemo, state?.demoChats]);

  // Candidate peers to start a new chat with = the doctor's account-linked
  // patients (roster + shared appointments), minus anyone already in a chat.
  const existingPeerIds = new Set(convs.map((c) => c.peerId).filter(Boolean));
  const appts = state?.myAppointments || [];
  const candidatesMap = new Map();
  const addCandidate = (id, name) => {
    if (id && !existingPeerIds.has(id) && !candidatesMap.has(id)) candidatesMap.set(id, name || 'Patient');
  };
  for (const a of appts) addCandidate(isDoctor ? a.patientId : a.doctorId, isDoctor ? a.patientName : a.doctorName);
  if (isDoctor) for (const p of (state?.patients || [])) addCandidate(p.userId, p.name);
  const candidates = [...candidatesMap.entries()].map(([id, name]) => ({ id, name }));

  // En démonstration rien n'est écrit en base : on le dit au lieu d'ouvrir un
  // sélecteur dont aucun choix n'aboutirait.
  const openNewConversation = () => {
    if (isDemo) {
      setState?.({ toast: "Aperçu de démonstration — la messagerie s'active avec votre compte.", toastShow: true });
      return;
    }
    setShowNew(true);
  };

  const startConversation = async (peer) => {
    if (!appUser) return;
    setCreating(true);
    try {
      const patientId = isDoctor ? peer.id : appUser.id;
      const doctorId  = isDoctor ? state?.myDoctor?.id : peer.id;
      if (!doctorId || !patientId) throw new Error('profil incomplet');
      const conv = await getOrCreateConversation(patientId, doctorId);
      // Inject the thread locally so it opens instantly (don't depend on the
      // list refetch), then refresh the list in the background.
      setConvs((cur) => cur.some((c) => c.id === conv.id)
        ? cur
        : [{ id: conv.id, ci: cur.length, peer: peer.name || 'Patient', peerId: peer.id }, ...cur]);
      setShowNew(false);
      setActiveId(conv.id);
      loadConvs(false);
    } catch (e) {
      setState({ toast: 'Impossible de démarrer la conversation : ' + dbErrorMessage(e), toastShow: true });
    } finally { setCreating(false); }
  };

  // Deep-link: "Message" buttons elsewhere (fiche patient) land here with the
  // patient's conversation already open (created on the fly if needed).
  useEffect(() => {
    const peerId = state?.chatOpenPeer;
    if (!peerId || !appUser) return;
    setState({ chatOpenPeer: null });
    startConversation({ id: peerId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.chatOpenPeer, appUser?.id]);

  // Load messages for the active conversation, then live-stream new ones.
  useEffect(() => {
    if (!activeId) { setMsgs([]); return; }
    if (isDemo) {
      const c = (state?.demoChats || []).find((x) => x.id === activeId);
      setMsgs((c?.messages || []).map((m) => ({ id: m.id, mine: m.from === 'doctor', type: 'text', text: m.content, url: m.content, time: fmtTime(m.sent_at) })));
      return;
    }
    let unsub = () => {};
    // Re-fetch from the server, keeping any not-yet-persisted optimistic bubbles.
    const refetch = async () => {
      try {
        const list = await fetchMessages(activeId);
        const server = list.map((m) => ({ id: m.id, mine: m.sender_id === appUser?.id, type: isImageMessage(m.content) ? 'image' : 'text', text: m.content, url: m.content, time: fmtTime(m.sent_at) }));
        setMsgs((cur) => {
          const pending = cur.filter((x) => String(x.id).startsWith('tmp_') && !server.some((s) => s.text === x.text));
          return [...server, ...pending];
        });
      } catch (e) { /* keep current on transient error */ }
    };
    refetch();
    // Poll as a reliability fallback so messages always show even if realtime is off.
    const poll = setInterval(refetch, 5000);
    const clearPoll = () => clearInterval(poll);
    (async () => {
      // Append messages as they arrive (from either party), de-duplicating our
      // own optimistic bubbles and any row we already hold.
      unsub = subscribeToConversation(activeId, (m) => {
        setMsgs((cur) => {
          if (cur.some((x) => x.id === m.id)) return cur;
          const mine = m.sender_id === appUser?.id;
          if (mine) {
            const i = cur.findIndex((x) => String(x.id).startsWith('tmp_') && x.text === m.content);
            if (i >= 0) {
              const copy = [...cur];
              copy[i] = { ...copy[i], id: m.id, time: fmtTime(m.sent_at) };
              return copy;
            }
          }
          return [...cur, { id: m.id, mine, type: isImageMessage(m.content) ? 'image' : 'text', text: m.content, url: m.content, time: fmtTime(m.sent_at) }];
        });
      });
    })();
    return () => { unsub(); clearPoll(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, appUser?.id, isDemo, state?.demoChats]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs.length, activeId]);

  const active = convs.find((c) => c.id === activeId);

  const doSend = async () => {
    const text = inputVal.trim();
    if (!text || !activeId) return;
    if (isDemo) {
      // Append the doctor's reply to the in-memory conversation; the effect
      // re-renders the thread from state.demoChats.
      const msg = { id: 'd_' + Date.now(), from: 'doctor', content: text, sent_at: new Date().toISOString() };
      setState({ demoChats: (state.demoChats || []).map((c) => c.id === activeId ? { ...c, messages: [...c.messages, msg] } : c) });
      setInputVal('');
      return;
    }
    if (!appUser) return;
    setInputVal('');
    setMsgs((m) => [...m, { id: 'tmp_' + Date.now(), mine: true, type: 'text', text, time: 'maintenant' }]);
    try { await sendMessage(activeId, appUser.id, text); }
    catch (e) { setState({ toast: 'Envoi impossible : ' + dbErrorMessage(e), toastShow: true }); }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
  };

  const removeConversation = async (id) => {
    if (!id || !window.confirm('Supprimer cette conversation ? Les messages seront définitivement effacés.')) return;
    if (isDemo) {
      setState({ demoChats: (state.demoChats || []).filter((c) => c.id !== id) });
      setConvs((list) => list.filter((c) => c.id !== id));
      if (activeId === id) { setActiveId(null); setMsgs([]); }
      return;
    }
    try {
      await deleteConversation(id);
      setConvs((list) => list.filter((c) => c.id !== id));
      if (activeId === id) { setActiveId(null); setMsgs([]); }
    } catch (e) {
      setState({ toast: 'Suppression impossible : ' + dbErrorMessage(e), toastShow: true });
    }
  };

  // Images/audio are session-only (the messages table stores text).
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !activeId) return;
    if (isDemo) {   // demo: preview locally, nothing to persist
      const url = URL.createObjectURL(file);
      const msg = { id: 'd_' + Date.now(), from: 'doctor', content: url, sent_at: new Date().toISOString() };
      setState({ demoChats: (state.demoChats || []).map((c) => c.id === activeId ? { ...c, messages: [...c.messages, msg] } : c) });
      return;
    }
    if (!appUser) return;
    try {
      const url = await uploadChatImage(file);
      setMsgs((m) => [...m, { id: 'tmp_' + Date.now(), mine: true, type: 'image', url, text: url, time: 'maintenant' }]);
      await sendMessage(activeId, appUser.id, url);
    } catch (err) {
      setState({ toast: 'Envoi de l’image échoué : ' + (err?.message || 'erreur'), toastShow: true });
    }
  };
  // Le bouton micro a été retiré : il n'enregistrait RIEN (ni MediaRecorder ni
  // getUserMedia) et fabriquait une bulle « message vocal · 0:12 » purement
  // décorative, jamais envoyée par sendMessage(). Dans une conversation
  // médicale, un message inventé qui a l'air transmis est pire qu'absent.
  // Pour le rétablir il faudra : getUserMedia → MediaRecorder → téléversement
  // dans le bucket de pièces jointes → sendMessage(jeton audio).

  // Hauteur exacte du bandeau : « 100vh moins une constante » se trompait dès
  // qu'une barre s'ajoutait en haut (mode démonstration, rappel de paiement) et
  // le bas de la messagerie passait sous le pli. On mesure ce qui reste.
  const shellRef = useRef(null);
  const [shellH, setShellH] = useState(null);
  useLayoutEffect(() => {
    const fit = () => {
      const el = shellRef.current;
      if (el) setShellH(Math.max(340, Math.round(window.innerHeight - el.getBoundingClientRect().top)));
    };
    fit();
    window.addEventListener('resize', fit);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(document.body);
    return () => { window.removeEventListener('resize', fit); ro?.disconnect(); };
  }, []);

  const filteredConvs = searchVal.trim()
    ? convs.filter((c) => (c.peer || '').toLowerCase().includes(searchVal.toLowerCase()))
    : convs;

  return (
    /* La messagerie garde ses marges comme les autres sections : elle occupait
       toute la fenêtre, bord à bord, alors que le reste de l'espace cabinet
       respire. Sur téléphone en revanche on reste pleine largeur — une
       conversation encadrée sur un écran de 6 pouces ne sert personne. */
    <div ref={shellRef} style={{ height: shellH ? shellH : 'calc(100vh - 64px)', padding: isMobile ? 0 : '26px 58px 30px', boxSizing: 'border-box', background: BG }}>
      <div style={{ display: 'flex', height: '100%', overflow: 'hidden', borderRadius: isMobile ? 0 : 20, border: isMobile ? 'none' : `1px solid ${BORDER_STRONG}`, background: '#fff', boxShadow: isMobile ? 'none' : '0 1px 2px rgba(16,42,32,0.04), 0 24px 48px -32px rgba(16,42,32,0.45)' }}>
      {/* Left Panel */}
      <div style={{ width: isMobile ? '100%' : 300, flexShrink: 0, borderRight: `1px solid ${BORDER_STRONG}`, background: '#fff', display: (isMobile && activeId) ? 'none' : 'flex', flexDirection: 'column' }}>
        {/* Bandeau vert profond : la messagerie reprend la matière des rails du
            cabinet au lieu du blanc générique. */}
        <div style={{ position: 'relative', overflow: 'hidden', padding: '16px 18px 14px', background: 'linear-gradient(150deg, #0F6E56 0%, #0A3D2D 100%)' }}>
          <span aria-hidden style={{ position: 'absolute', insetInlineEnd: -48, top: -62, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
          <span style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <span style={{ width: 32, height: 32, borderRadius: 11, background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.24)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{ICONS.chat}</span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 16, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>Messages</span>
              <span style={{ display: 'block', fontSize: 11.5, color: 'rgba(255,255,255,0.68)', fontWeight: 600 }}>
                {convs.length > 0 ? `${convs.length} conversation${convs.length > 1 ? 's' : ''}` : 'Aucune conversation'}
              </span>
            </span>
          </span>

          {/* Un bouton visible en toutes circonstances : en démonstration il
              était masqué, et le médecin n'avait aucun moyen d'écrire. */}
          <button onClick={openNewConversation} title="Nouvelle conversation"
            style={{ position: 'relative', marginTop: 14, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: BTN_GREEN, color: '#fff', border: 'none', borderRadius: 12, padding: '11px 14px', fontSize: 13.5, fontWeight: 800, cursor: 'pointer', boxShadow: '0 12px 24px -12px rgba(22,160,106,0.95)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            Nouvelle conversation
          </button>
        </div>

        <div style={{ margin: '12px 12px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: BG, border: `1px solid ${BORDER_STRONG}`, borderRadius: 12, padding: '10px 12px' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B7B76" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
            <input value={searchVal} onChange={(e) => setSearchVal(e.target.value)} placeholder="Rechercher une conversation…" style={{ border: 'none', outline: 'none', background: 'none', flex: 1, fontSize: 13, color: DARK }} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredConvs.length === 0 && (
            <div style={{ padding: '24px 20px', color: MUTED, fontSize: 13, textAlign: 'center' }}>
              Aucune conversation pour le moment.
            </div>
          )}
          {filteredConvs.map((c) => {
            const [tBg, tFg] = TINTS[c.ci % TINTS.length];
            const isActive = activeId === c.id;
            return (
              <div key={c.id} onClick={() => setActiveId(c.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', margin: '0 10px 6px', borderRadius: 13, cursor: 'pointer', background: isActive ? 'linear-gradient(150deg, #E3F5EC 0%, #F4FBF7 100%)' : '#fff', border: `1px solid ${isActive ? '#A9DCC5' : 'transparent'}`, boxShadow: isActive ? '0 10px 22px -16px rgba(11,90,60,0.9)' : 'none', transition: 'background .14s, border-color .14s' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: tBg, color: tFg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0, boxShadow: isActive ? '0 0 0 2px #fff, 0 0 0 3.5px #16A06A' : 'none' }}>
                  {initials(c.peer)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: DARK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>{c.peer}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 600, padding: '1px 6px', borderRadius: 99, background: '#E7F6EE', color: '#138257', flexShrink: 0 }}>
                      {isDoctor ? 'Patient' : 'Médecin'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Panel */}
      <div style={{ flex: 1, display: (isMobile && !activeId) ? 'none' : 'flex', flexDirection: 'column', background: BG, minWidth: 0 }}>
        {active ? (
          <>
            {/* Chat header */}
            <div style={{ background: '#fff', borderBottom: `1px solid ${BORDER_STRONG}`, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              {isMobile && (
                <button onClick={() => setActiveId(null)} aria-label="Retour" style={{ width: 40, height: 40, borderRadius: 11, background: BG, border: `1px solid ${BORDER_STRONG}`, cursor: 'pointer', fontSize: 20, color: DARK, flexShrink: 0 }}>‹</button>
              )}
              {(() => {
                const [tBg, tFg] = TINTS[active.ci % TINTS.length];
                return (
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: tBg, color: tFg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, flexShrink: 0 }}>
                    {initials(active.peer)}
                  </div>
                );
              })()}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 16, color: DARK }}>{active.peer}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 99, background: '#E7F6EE', color: '#138257' }}>
                    {isDoctor ? 'Patient' : 'Médecin'}
                  </span>
                </div>
              </div>
              <button onClick={() => removeConversation(active.id)} title="Supprimer la conversation" style={{ width: 38, height: 38, borderRadius: 10, background: '#FCE8EC', border: '1px solid #F2C2CD', cursor: 'pointer', color: '#C2415C', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/></svg>
              </button>
            </div>

            {/* Messages area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12, background: 'linear-gradient(180deg, #F3FAF6 0%, #EDF6F1 100%)' }}>
              {msgs.map((msg) => {
                const isMe = msg.mine;
                return (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                    {msg.type === 'image' ? (
                      <div style={{ position: 'relative', maxWidth: 200 }}>
                        <ChatImage token={msg.url} style={{ borderRadius: 12, maxWidth: 200, maxHeight: 150, objectFit: 'cover', display: 'block' }} />
                      </div>
                    ) : msg.type === 'audio' ? (
                      <div style={{ background: isMe ? PRIMARY : '#fff', color: isMe ? '#fff' : DARK, borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px', border: isMe ? 'none' : `1px solid ${BORDER}`, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, maxWidth: '68%' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                        <span style={{ fontSize: 13 }}>Message vocal · {msg.duration || '0:12'}</span>
                      </div>
                    ) : (
                      <div style={{ background: isMe ? 'linear-gradient(150deg, #16A06A 0%, #0E7C52 100%)' : '#fff', color: isMe ? '#fff' : DARK, borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px', border: isMe ? 'none' : `1px solid ${BORDER}`, padding: '10px 14px', maxWidth: '68%', fontSize: 14, lineHeight: 1.5, wordBreak: 'break-word', boxShadow: isMe ? '0 8px 18px -12px rgba(11,90,60,0.9)' : '0 6px 14px -12px rgba(16,42,32,0.6)' }}>
                        {msg.text}
                      </div>
                    )}
                    <span style={{ fontSize: 10.5, color: MUTED, marginTop: 3 }}>{msg.time}</span>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div style={{ background: 'linear-gradient(180deg, rgba(237,246,241,0) 0%, #EDF6F1 40%)', padding: '10px 16px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: `1px solid ${BORDER_STRONG}`, borderRadius: 26, padding: '7px 8px 7px 10px', boxShadow: '0 10px 26px -18px rgba(16,42,32,0.8)' }}>
                <button onClick={() => fileInputRef.current?.click()} title="Joindre une image" style={{ background: BG, border: `1px solid ${BORDER_STRONG}`, borderRadius: 10, cursor: 'pointer', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: MUTED }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                </button>
                <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImageUpload} />

                <input value={inputVal} onChange={(e) => setInputVal(e.target.value)} onKeyDown={handleKeyDown} placeholder="Écrire un message…" style={{ flex: 1, background: 'none', border: 'none', padding: '8px 8px', fontSize: 14, outline: 'none', color: DARK }} />

                <button onClick={doSend} aria-label="Envoyer le message" disabled={!inputVal.trim()} style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: inputVal.trim() ? BTN_GREEN : BORDER_STRONG, border: 'none', cursor: inputVal.trim() ? 'pointer' : 'default', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s' }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></svg>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
            <div style={{ width: 92, height: 92, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0E7C52', background: 'radial-gradient(circle at 35% 30%, #E3F5EC 0%, #CFEDDF 70%)', boxShadow: '0 20px 40px -26px rgba(11,90,60,0.9), inset 0 1px 0 #fff' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: DARK }}>Aucune conversation</div>
            <div style={{ fontSize: 14, color: MUTED, maxWidth: 280, textAlign: 'center' }}>
              {isDemo ? 'Sélectionnez une conversation pour lire les échanges avec vos patients.' : isDoctor ? 'Démarrez une conversation avec un de vos patients.' : 'Démarrez une conversation avec un médecin déjà consulté.'}
            </div>
            <button onClick={openNewConversation} style={{ ...greenBtn, marginTop: 4 }}>
              + Nouvelle conversation
            </button>
          </div>
        )}
      </div>
      </div>

      {/* New-conversation picker */}
      {showNew && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setShowNew(false); }} style={{ position: 'fixed', inset: 0, background: 'rgba(21,49,74,0.45)', zIndex: 300, display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'center', padding: isMobile ? '20px 12px' : 24, overflowY: 'auto' }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420, boxShadow: '0 24px 60px rgba(21,49,74,0.3)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 22px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: DARK }}>Nouvelle conversation</span>
              <button onClick={() => setShowNew(false)} style={{ background: BG, border: `1px solid ${BORDER}`, cursor: 'pointer', width: 30, height: 30, borderRadius: 8, color: MUTED, fontSize: 14 }}>✕</button>
            </div>
            <div style={{ padding: 12, maxHeight: '60vh', overflowY: 'auto' }}>
              <div style={{ fontSize: 12, color: MUTED, padding: '4px 10px 10px' }}>
                {isDoctor ? 'Choisissez un patient' : 'Choisissez un médecin déjà consulté'}
              </div>
              {candidates.length === 0 && (
                <div style={{ padding: '22px 14px', textAlign: 'center', color: MUTED, fontSize: 13 }}>
                  {isDoctor ? 'Aucun patient disponible — les patients apparaissent après un rendez-vous.' : 'Aucun médecin consulté pour le moment.'}
                </div>
              )}
              {candidates.map((p) => (
                <button key={p.id} disabled={creating} onClick={() => startConversation(p)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'start', background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '11px 14px', marginBottom: 8, cursor: creating ? 'default' : 'pointer' }}>
                  <span style={{ width: 36, height: 36, borderRadius: '50%', background: '#E7F6EE', color: '#138257', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>{initials(p.name)}</span>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: DARK }}>{p.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: PRIMARY }}>Démarrer</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
