import { createContext, useContext } from 'react'
import it from './it'
import en from './en'

export const translations = { it, en }

export const LangCtx = createContext('it')

/** Hook — use anywhere inside <LangCtx.Provider> */
export const useLang = () => {
  const lang = useContext(LangCtx)
  return translations[lang] ?? translations.it
}
