import { useCallback, useEffect, useRef, useState } from 'react'
import { secBoardApi } from '../../api/client'
import {
  DEFAULT_SECBOARD_SETTINGS,
  type SecBoardSettingsPatch,
  type SecBoardSettingsV1
} from '../../api/contracts'

export type SettingsSaveState = 'idle' | 'loading' | 'saving' | 'saved' | 'error'

export function useSecBoardSettings() {
  const [settings, setSettings] = useState<SecBoardSettingsV1>(DEFAULT_SECBOARD_SETTINGS)
  const [status, setStatus] = useState<SettingsSaveState>('loading')
  const [error, setError] = useState('')
  const saveRevision = useRef(0)

  const reload = useCallback(async () => {
    setStatus('loading')
    setError('')
    try {
      setSettings(await secBoardApi.getSettings())
      setStatus('idle')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const patch = useCallback(async (nextPatch: SecBoardSettingsPatch) => {
    const revision = ++saveRevision.current
    const previous = settings
    const optimistic: SecBoardSettingsV1 = {
      ...previous,
      ...nextPatch,
      version: 1,
      writingEngine: 'leafer',
      leafer: { ...previous.leafer, ...nextPatch.leafer },
      whiteboard: { ...previous.whiteboard, ...nextPatch.whiteboard },
      videoShow: { ...previous.videoShow, ...nextPatch.videoShow }
    }
    setSettings(optimistic)
    setStatus('saving')
    setError('')
    try {
      const persisted = await secBoardApi.patchSettings(nextPatch)
      if (revision !== saveRevision.current) return
      setSettings(persisted)
      setStatus('saved')
      window.setTimeout(() => setStatus((value) => value === 'saved' ? 'idle' : value), 1200)
    } catch (reason) {
      if (revision !== saveRevision.current) return
      setSettings(previous)
      setError(reason instanceof Error ? reason.message : String(reason))
      setStatus('error')
    }
  }, [settings])

  return { settings, status, error, patch, reload }
}
