import React, { createContext, useContext, useState, useCallback } from 'react'
import ToastContainer from '../components/common/Toast.jsx'

const ToastContext = createContext(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [queue, setQueue] = useState([])

  const dismissToast = useCallback((id) => {
    setToasts((prevActive) => prevActive.filter((t) => t.id !== id))
    setQueue((prevQueue) => {
      if (prevQueue.length === 0) return prevQueue
      const [next, ...rest] = prevQueue
      setToasts((currentActive) => {
        if (currentActive.some((t) => t.id === next.id)) return currentActive
        return [...currentActive, next]
      })
      return rest
    })
  }, [])

  const addToast = useCallback((message, type = 'info') => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast = { id, message, type }

    setToasts((prevActive) => {
      if (prevActive.some((t) => t.message === message && t.type === type)) return prevActive
      if (prevActive.length < 3) {
        return [...prevActive, newToast]
      }

      setQueue((prevQueue) => {
        if (prevQueue.some((t) => t.message === message && t.type === type)) return prevQueue
        return [...prevQueue, newToast]
      })
      return prevActive
    })
  }, [])

  const showSuccess = useCallback((msg) => addToast(msg, 'success'), [addToast])
  const showError = useCallback((msg) => addToast(msg, 'error'), [addToast])
  const showInfo = useCallback((msg) => addToast(msg, 'info'), [addToast])
  const showWarning = useCallback((msg) => addToast(msg, 'warning'), [addToast])

  React.useEffect(() => {
    const handleToastAlert = (e) => {
      const { message, type } = e.detail || {}
      if (message) {
        if (type === 'success') showSuccess(message)
        else if (type === 'error') showError(message)
        else if (type === 'warning') showWarning(message)
        else showInfo(message)
      }
    }
    window.addEventListener('toast-alert', handleToastAlert)
    return () => window.removeEventListener('toast-alert', handleToastAlert)
  }, [showSuccess, showError, showInfo, showWarning])

  return (
    <ToastContext.Provider value={{ toasts, dismissToast, showSuccess, showError, showInfo, showWarning }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  )
}
