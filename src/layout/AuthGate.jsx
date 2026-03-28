import { LangCtx } from '@/i18n'
import LoadingScreen from '@/components/LoadingScreen'
import LoginPage from '@/pages/LoginPage'
import MfaPage from '@/pages/MfaPage'

/**
 * AuthGate — renders the appropriate auth screen (loading / login / MFA)
 * or passes through to children when the user is fully authenticated.
 */
export default function AuthGate({
  appLoading, user, needsMfa, lang, setLang, tr,
  onMfaComplete, children,
}) {
  if (appLoading)
    return <LangCtx.Provider value={lang}><LoadingScreen message={tr.loadingMsg} /></LangCtx.Provider>

  if (!user)
    return <LangCtx.Provider value={lang}><LoginPage lang={lang} setLang={setLang} /></LangCtx.Provider>

  if (needsMfa)
    return (
      <LangCtx.Provider value={lang}>
        <MfaPage onComplete={onMfaComplete} lang={lang} />
      </LangCtx.Provider>
    )

  return children
}
