import { createContext, useContext, useState, ReactNode } from 'react'

type AppState = {
  count: number
  setCount: (value: number) => void
}

const defaultState: AppState = {
  count: 0,
  setCount: () => {},
}

const AppContext = createContext<AppState>(defaultState)

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [count, setCount] = useState<number>(0)

  return (
    <AppContext.Provider value={{ count, setCount }}>
      {children}
    </AppContext.Provider>
  )
}

export const useAppContext = () => useContext(AppContext)

export default AppContext


