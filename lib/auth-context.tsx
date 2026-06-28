"use client"
import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react"
import { User } from "firebase/auth"
import { onAuthChange } from "./auth"
import { getUser, UserDoc } from "./firestore"

interface AuthContextType {
  user: User | null
  userDoc: UserDoc | null
  loading: boolean
  refreshUserDoc: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userDoc: null,
  loading: true,
  refreshUserDoc: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUserDoc = useCallback(async () => {
    if (!user) return
    const doc = await getUser(user.uid)
    setUserDoc(doc)
  }, [user])

  useEffect(() => {
    const unsub = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        const doc = await getUser(firebaseUser.uid)
        setUserDoc(doc)
      } else {
        setUserDoc(null)
      }
      setLoading(false)
    })
    return () => unsub()
  }, [])

  // ✅ Fix: removed "if (loading) return null" — children render immediately,
  // pages handle their own loading state via the loading flag from useAuth()
  return (
    <AuthContext.Provider value={{ user, userDoc, loading, refreshUserDoc }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
