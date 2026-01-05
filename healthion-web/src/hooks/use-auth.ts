import { useAuth0 } from '@auth0/auth0-react'
import { apiService, User } from '../lib/api'
import { useState, useEffect, useRef } from 'react'

// Global cache to prevent multiple /me calls across hook instances
let globalUserCache: User | null = null
let globalFetchPromise: Promise<User | null> | null = null

export const useAuth = () => {
  const {
    user,
    isAuthenticated,
    isLoading,
    loginWithRedirect,
    logout,
    getAccessTokenSilently,
    getIdTokenClaims,
  } = useAuth0()

  const [currentUser, setCurrentUser] = useState<User | null>(globalUserCache)
  const [isLoadingUser, setIsLoadingUser] = useState(false)
  const hasFetched = useRef(false)

  // Fetch current user data when authenticated (with global dedup)
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (!isAuthenticated || isLoading || hasFetched.current) return
      
      // If we have cached user, use it
      if (globalUserCache) {
        setCurrentUser(globalUserCache)
        return
      }
      
      // If another instance is already fetching, wait for it
      if (globalFetchPromise) {
        const cachedUser = await globalFetchPromise
        setCurrentUser(cachedUser)
        return
      }
      
      hasFetched.current = true
      setIsLoadingUser(true)
      
      // Create a shared promise for all instances
      globalFetchPromise = (async () => {
        try {
          const token = await getAccessTokenSilently()
          const response = await apiService.getCurrentUser(token)
          globalUserCache = response.data
          return response.data
        } catch (error) {
          console.error('Error fetching current user:', error)
          return null
        }
      })()
      
      try {
        const fetchedUser = await globalFetchPromise
        setCurrentUser(fetchedUser)
      } finally {
        setIsLoadingUser(false)
        globalFetchPromise = null
      }
    }

    fetchCurrentUser()
  }, [isAuthenticated, isLoading, getAccessTokenSilently])

  const login = () => {
    loginWithRedirect()
  }

  const logoutUser = () => {
    // Clear global cache on logout
    globalUserCache = null
    globalFetchPromise = null
    
    logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    })
  }

  const getAccessToken = async () => {
    try {
      return await getAccessTokenSilently()
    } catch (error) {
      console.error('Error getting access token:', error)
      return null
    }
  }

  const getIdToken = async () => {
    try {
      const claims = await getIdTokenClaims()
      return claims?.__raw
    } catch (error) {
      console.error('Error getting ID token:', error)
      return null
    }
  }

  return {
    user,
    currentUser,
    isAuthenticated,
    isLoading: isLoading || isLoadingUser,
    login,
    logout: logoutUser,
    getAccessToken,
    getIdToken,
  }
}
