import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, DeviceShell, LcdScreen, Pet, PixelIcon, SPECIES_LIST } from '../ds/index.js'
import Logo from '../ds/Logo.jsx'
import { SHELL_LIST, SHELL_THEME, applyShellTheme, getStoredShell, usePet } from '../game/store.jsx'

const STEPS = ['connect', 'species', 'shell', 'name']

const SOURCES = [
  { id: 'github', label: 'GitHub', note: 'where the slop usually happens' },
  { id: 'tangled', label: 'tangled.org', note: 'decentralised git. it still sees everything.' },
]

const SHELL_LABEL = {
  bubblegum: 'Bubblegum',
  sky: 'Sky',
  lemon: 'Lemon',
  lime: 'Lime',
  grape: 'Grape',
  tangerine: 'Tangerine',
  clear: 'Clear',
}

function StepDots({ step }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {STEPS.map((_, i) => (
        <span
          key={i}
          style={{
            width: i === step ? 26 : 9,
            height: 9,
            borderRadius: 999,
            background: i <= step ? 'var(--accent)' : 'var(--line-2)',
            transition: 'width var(--dur-base) var(--ease-snap), background var(--dur-base)',
          }}
        />
      ))}
    </div>
  )
}

function PreviewDevice({ species, shell, name, hatched }) {
  return (
    <div style={{ display: 'grid', placeItems: 'center', gap: 16 }}>
      <DeviceShell shell={shell} width={260} lit={hatched}>
        {hatched ? (
          <Pet species={species} mood="happy" scale={8} />
        ) : (
          <div style={{ fontFamily: 'var(--font-lcd)', color: 'var(--lcd-ink)', fontSize: 16, lineHeight: 1.4 }}>
            <div style={{ fontSize: 26 }}>· · ·</div>
            <div style={{ marginTop: 6 }}>warming up</div>
          </div>
        )}
      </DeviceShell>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 13, color: 'var(--ink)' }}>{name || 'unnamed'}</div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 700, marginTop: 6 }}>
          {SPECIES_LIST.find((s) => s.id === species)?.label} · {SHELL_LABEL[shell]} shell
        </div>
      </div>
    </div>
  )
}

export default function Onboarding() {
  const navigate = useNavigate()
  const { actions } = usePet()
  const [step, setStep] = useState(0)
  const [source, setSource] = useState('tangled')
  const [handle, setHandle] = useState('')
  const [team, setTeam] = useState('')
  const [githubUsername, setGithubUsername] = useState('')
  const [species, setSpecies] = useState('blip')
  const [shell, setShell] = useState(() => getStoredShell())
  const [name, setName] = useState('')

  // Keep the app accent in sync with the previewed shell, starting from the
  // default so the chrome doesn't inherit a stale theme from a prior pet.
  useEffect(() => {
    applyShellTheme(shell)
  }, [shell])

  const pickShell = (s) => {
    setShell(s)
    applyShellTheme(s)
  }

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1))
  const back = () => setStep((s) => Math.max(0, s - 1))

  const cleanHandle = handle.trim().replace(/^@/, '')
  const cleanTeam = team.trim().toLowerCase()
  const cleanGithub = githubUsername.trim().replace(/^@/, '')
  const willConnect = source === 'tangled' && cleanHandle && cleanTeam
  const willConnectGithub = source === 'github' && cleanGithub
  const connectedHandle = willConnect ? cleanHandle : willConnectGithub ? cleanGithub : ''

  const hatch = () => {
    actions.hatch({
      name: name.trim() || 'Mossy',
      species,
      shell,
      handle: connectedHandle,
      team: willConnect ? cleanTeam : '',
      source,
    })
    // Fire-and-forget: register with the backend. The local pet hatches
    // regardless, so a missing/unconfigured backend never blocks onboarding.
    if (willConnect) actions.connect({ handle: cleanHandle, team: cleanTeam, source })
    else if (willConnectGithub) actions.connectGithub({ githubUsername: cleanGithub })
    navigate('/play')
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {/* slim header */}
      <header style={{ borderBottom: '1px solid var(--line)' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72 }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <Logo size={30} />
          </button>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 14, color: 'var(--ink-3)' }}>
            Cancel
          </button>
        </div>
      </header>

      <div className="container" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 24px 64px' }}>
        <div style={{ width: '100%', maxWidth: 880, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <h1 className="pixel-display" style={{ fontSize: 'clamp(20px, 3vw, 26px)', textAlign: 'center' }}>hatch your egg</h1>
          <p style={{ color: 'var(--ink-2)', fontWeight: 600, fontSize: 15, textAlign: 'center', marginBottom: 18 }}>
            four tiny decisions and then a lifetime of mild disappointment together.
          </p>
          <StepDots step={step} />
        </div>

        <Card padding={0} style={{ width: '100%', maxWidth: 880, marginTop: 28, overflow: 'hidden' }}>
          <div className="onb-grid">
            {/* live preview */}
            <div className="onb-preview" style={{ background: 'var(--surface-sunken)', borderRight: '1px solid var(--line)', padding: 28, display: 'grid', placeItems: 'center' }}>
              <PreviewDevice species={species} shell={shell} name={name} hatched={step >= 1} />
            </div>

            {/* step body */}
            <div style={{ padding: 32, display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1 }}>
                {step === 0 && (
                  <div className="fade-up">
                    <div className="section-label">Step 1 · connect</div>
                    <h2 style={{ fontFamily: 'var(--font-pixel)', fontSize: 15, margin: '12px 0 6px', lineHeight: 1.5 }}>where do you ship from?</h2>
                    <p style={{ color: 'var(--ink-2)', fontWeight: 600, fontSize: 14, marginBottom: 18 }}>
                      We promise to only judge the AI-generated parts. (It's most of them.)
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {SOURCES.map((src) => {
                        const on = source === src.id
                        return (
                          <button
                            key={src.id}
                            onClick={() => setSource(src.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 14,
                              textAlign: 'left',
                              padding: '14px 16px',
                              borderRadius: 'var(--radius-md)',
                              border: `2px solid ${on ? 'var(--accent)' : 'var(--line)'}`,
                              background: on ? 'var(--accent-soft)' : 'var(--surface-card)',
                              cursor: 'pointer',
                              transition: 'border-color var(--dur-fast), background var(--dur-fast)',
                            }}
                          >
                            <span
                              style={{
                                width: 26,
                                height: 26,
                                borderRadius: '50%',
                                display: 'grid',
                                placeItems: 'center',
                                background: on ? 'var(--accent)' : 'var(--paper-2)',
                                border: on ? 'none' : '2px solid var(--line-2)',
                                boxSizing: 'border-box',
                              }}
                            >
                              {on && <PixelIcon name="check" scale={2.5} color="#fff" />}
                            </span>
                            <span style={{ flex: 1 }}>
                              <span style={{ display: 'block', fontWeight: 800, fontSize: 15, color: 'var(--ink)' }}>{src.label}</span>
                              <span style={{ display: 'block', fontSize: 13, color: 'var(--ink-3)', fontWeight: 600 }}>{src.note}</span>
                            </span>
                          </button>
                        )
                      })}
                    </div>

                    {source === 'tangled' ? (
                      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink-3)' }}>your tangled handle</span>
                          <input
                            value={handle}
                            onChange={(e) => setHandle(e.target.value)}
                            placeholder="alice.tngl.sh"
                            autoComplete="off"
                            spellCheck={false}
                            style={connectInputStyle}
                          />
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink-3)' }}>team zoo</span>
                          <input
                            value={team}
                            onChange={(e) => setTeam(e.target.value)}
                            placeholder="acme"
                            autoComplete="off"
                            spellCheck={false}
                            style={connectInputStyle}
                          />
                        </label>
                        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', margin: 0 }}>
                          {willConnect
                            ? "we'll score your real pull requests and drop your pet into the team zoo."
                            : 'leave these blank to just play with a local pet — no scoring, no judgment. (well, less judgment.)'}
                        </p>
                      </div>
                    ) : (
                      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink-3)' }}>your github username</span>
                          <input
                            value={githubUsername}
                            onChange={(e) => setGithubUsername(e.target.value)}
                            placeholder="octocat"
                            autoComplete="off"
                            spellCheck={false}
                            style={connectInputStyle}
                          />
                        </label>
                        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', margin: 0 }}>
                          {willConnectGithub
                            ? "we'll score your recent public pull requests — no account or login needed, since it's all public anyway."
                            : 'leave this blank to just play with a local pet — no scoring, no judgment. (well, less judgment.)'}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {step === 1 && (
                  <div className="fade-up">
                    <div className="section-label">Step 2 · pick your pet</div>
                    <h2 style={{ fontFamily: 'var(--font-pixel)', fontSize: 15, margin: '12px 0 16px', lineHeight: 1.5 }}>who's hatching?</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                      {SPECIES_LIST.map((s) => {
                        const sel = species === s.id
                        return (
                          <button
                            key={s.id}
                            onClick={() => setSpecies(s.id)}
                            title={s.blurb}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: 6,
                              padding: 8,
                              borderRadius: 'var(--radius-md)',
                              border: `2px solid ${sel ? 'var(--accent)' : 'var(--line)'}`,
                              background: sel ? 'var(--accent-soft)' : 'var(--surface-card)',
                              cursor: 'pointer',
                            }}
                          >
                            <LcdScreen bezel={false} width="100%" height={58} style={{ borderRadius: 10, overflow: 'hidden' }}>
                              <Pet species={s.id} mood="happy" scale={3} animate={false} />
                            </LcdScreen>
                            <span style={{ fontSize: 12, fontWeight: 800, color: sel ? 'var(--accent-press)' : 'var(--ink-2)' }}>{s.label}</span>
                          </button>
                        )
                      })}
                    </div>
                    <p style={{ fontFamily: 'var(--font-lcd)', fontSize: 14, color: 'var(--ink-3)', marginTop: 14, minHeight: 20 }}>
                      “{SPECIES_LIST.find((s) => s.id === species)?.blurb}”
                    </p>
                  </div>
                )}

                {step === 2 && (
                  <div className="fade-up">
                    <div className="section-label">Step 3 · shell</div>
                    <h2 style={{ fontFamily: 'var(--font-pixel)', fontSize: 15, margin: '12px 0 6px', lineHeight: 1.5 }}>choose a case colour</h2>
                    <p style={{ color: 'var(--ink-2)', fontWeight: 600, fontSize: 14, marginBottom: 18 }}>
                      It tints the whole app. Pick the one that best hides your shame.
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
                      {SHELL_LIST.filter((sh) => sh !== 'clear').map((sh) => {
                        const sel = shell === sh
                        return (
                          <button
                            key={sh}
                            onClick={() => pickShell(sh)}
                            title={SHELL_LABEL[sh]}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: 8,
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 4,
                            }}
                          >
                            <span
                              style={{
                                width: 52,
                                height: 60,
                                borderRadius: 'var(--radius-egg)',
                                backgroundColor: `var(--shell-${sh})`,
                                backgroundImage: 'var(--gloss-radial)',
                                boxShadow: sel ? '0 0 0 3px var(--paper), 0 0 0 6px var(--accent)' : 'var(--shadow-plastic-sm)',
                                transition: 'box-shadow var(--dur-fast)',
                              }}
                            />
                            <span style={{ fontSize: 12, fontWeight: 800, color: sel ? 'var(--accent-press)' : 'var(--ink-3)' }}>{SHELL_LABEL[sh]}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="fade-up">
                    <div className="section-label">Step 4 · name</div>
                    <h2 style={{ fontFamily: 'var(--font-pixel)', fontSize: 15, margin: '12px 0 6px', lineHeight: 1.5 }}>name your slopagotchi</h2>
                    <p style={{ color: 'var(--ink-2)', fontWeight: 600, fontSize: 14, marginBottom: 18 }}>
                      It'll learn this name and use it against you later.
                    </p>
                    <input
                      autoFocus
                      value={name}
                      maxLength={5}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && hatch()}
                      placeholder="Mossy"
                      style={{
                        width: '100%',
                        height: 56,
                        padding: '0 18px',
                        fontFamily: 'var(--font-lcd)',
                        fontSize: 22,
                        color: 'var(--lcd-ink)',
                        background: 'var(--lcd-screen)',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'var(--shadow-screen)',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                )}
              </div>

              {/* nav */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 28 }}>
                <Button variant="ghost" pixel={false} size="md" onClick={back} disabled={step === 0}>
                  Back
                </Button>
                {step < STEPS.length - 1 ? (
                  <Button pixel={false} size="md" onClick={next}>
                    Continue
                  </Button>
                ) : (
                  <Button pixel={false} size="md" onClick={hatch}>
                    Hatch it
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

const connectInputStyle = {
  width: '100%',
  height: 44,
  padding: '0 14px',
  fontSize: 15,
  fontWeight: 700,
  color: 'var(--ink)',
  background: 'var(--surface-card)',
  border: '2px solid var(--line)',
  borderRadius: 'var(--radius-md)',
  outline: 'none',
  boxSizing: 'border-box',
}
