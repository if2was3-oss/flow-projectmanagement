import { ArrowRight, Layers3, LockKeyhole, Sparkles } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useFlow } from '../lib/store';
import { supabase } from '../lib/supabase';
import { errorMessage } from '../lib/utils';
export function Auth() {
  const flow = useFlow();
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError('');
    setInfo('');
    try {
      if (flow.recovery) {
        const r = await supabase.auth.updateUser({ password });
        if (r.error) throw r.error;
        flow.setRecovery(false);
        flow.setToast('A jelszavad megváltozott.');
      } else if (mode === 'signup') {
        const r = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name }, emailRedirectTo: window.location.origin },
        });
        if (r.error) throw r.error;
        if (!r.data.session)
          setInfo('Nézd meg a postaládádat! A kapott levélben erősítsd meg a regisztrációt.');
      } else if (mode === 'reset') {
        const r = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (r.error) throw r.error;
        setInfo('Ha tartozik fiók az e-mail-címhez, elküldtük a helyreállítási levelet.');
      } else {
        const r = await supabase.auth.signInWithPassword({ email, password });
        if (r.error) throw r.error;
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-layout">
      <div className="auth-story">
        <div className="brand">
          <span className="brand-mark">
            <Layers3 size={24} />
          </span>
          flow<span className="brand-period">.</span>
        </div>
        <div>
          <span className="eyebrow">KEVESEBB SZERVEZÉS. TÖBB ALKOTÁS.</span>
          <h1>
            A jó ötletek
            <br />
            itt lendületet kapnak.
          </h1>
          <p>
            Egy közös tér a csapatod projektjeinek,
            <br />
            feladatainak és következő nagy dobásának.
          </p>
          <div className="auth-art">
            <div className="art-card">
              <Sparkles />
              <span>Valami nagyszerű készül.</span>
              <div className="art-progress">
                <i />
              </div>
              <small>A csapattal minden könnyebb.</small>
            </div>
            <div className="art-dot one" />
            <div className="art-dot two" />
          </div>
        </div>
        <span className="auth-footer">Kis csapatoknak. Nagy ötletekhez.</span>
      </div>
      <main className="auth-form">
        <div className="auth-form-inner">
          <span className="auth-lock">
            <LockKeyhole size={22} />
          </span>
          <h2>
            {flow.recovery
              ? 'Új jelszó'
              : mode === 'signup'
                ? 'Kezdjük el együtt!'
                : mode === 'reset'
                  ? 'Elfelejtett jelszó'
                  : 'Jó újra itt látni.'}
          </h2>
          <p>
            {mode === 'signup'
              ? 'Hozd létre a fiókodat, és adj teret az ötleteknek.'
              : 'Lépj be a Flow munkateredbe.'}
          </p>
          <form onSubmit={submit}>
            {mode === 'signup' && !flow.recovery && (
              <label>
                Teljes név
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  placeholder="Kiss Anna"
                  maxLength={100}
                />
              </label>
            )}
            {!flow.recovery && (
              <label>
                E-mail-cím
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="anna@csapatod.hu"
                />
              </label>
            )}
            {(mode !== 'reset' || flow.recovery) && (
              <label>
                Jelszó
                <input
                  required
                  type="password"
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder="Legalább 8 karakter"
                />
              </label>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            {info && (
              <p className="form-info" role="status">
                {info}
              </p>
            )}
            <button className="button primary" disabled={busy}>
              {busy
                ? 'Egy pillanat…'
                : flow.recovery
                  ? 'Jelszó mentése'
                  : mode === 'signup'
                    ? 'Fiók létrehozása'
                    : mode === 'reset'
                      ? 'Helyreállítási levél küldése'
                      : 'Bejelentkezés'}
              <ArrowRight size={16} />
            </button>
          </form>
          {!flow.recovery && (
            <>
              <button
                className="text-button auth-switch"
                onClick={() => {
                  setMode(mode === 'signup' ? 'login' : 'signup');
                  setError('');
                  setInfo('');
                }}
              >
                {mode === 'signup'
                  ? 'Már van fiókod? Jelentkezz be'
                  : 'Új vagy itt? Hozz létre egy fiókot'}
              </button>
              {mode === 'login' && (
                <button className="text-button auth-switch" onClick={() => setMode('reset')}>
                  Elfelejtetted a jelszavad?
                </button>
              )}
              <div className="auth-divider">vagy nézz körül először</div>
              <button className="button secondary full" onClick={flow.enterDemo}>
                Mintakörnyezet megnyitása
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
export function WorkspaceSetup() {
  const flow = useFlow();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <div className="setup-page">
      <div className="setup-card">
        <span className="brand-mark">
          <Layers3 />
        </span>
        <h1>Legyen ez a közös teretek.</h1>
        <p>Adj nevet a munkatérnek, majd hívd meg a csapatodat.</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await flow.createTeam(name.trim());
            } catch (e) {
              setError(errorMessage(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Munkatér neve
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Például: Studio North"
              required
              maxLength={80}
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="button primary" disabled={busy || !name.trim()}>
            {busy ? 'Létrehozás…' : 'Munkatér létrehozása'}
            <ArrowRight size={16} />
          </button>
        </form>
        <p className="muted">
          Meghívást kaptál? Az e-mail-címedhez tartozó meghívást bejelentkezéskor automatikusan
          elfogadjuk.
        </p>
        <button
          className="text-button"
          onClick={() => flow.reload().catch((e) => setError(errorMessage(e)))}
        >
          Meghívások újraellenőrzése
        </button>
        <button className="text-button" onClick={() => void flow.signOut()}>
          Kijelentkezés
        </button>
      </div>
    </div>
  );
}
