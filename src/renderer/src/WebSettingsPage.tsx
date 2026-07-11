import { ArrowLeft20Regular } from '@fluentui/react-icons'
import React, { useState } from 'react'
import { motion, useReducedMotion } from '../../Framer_Motion'
import { SettingsSidebar } from '../../settings/components/SettingsSidebar'
import { SettingsContent } from '../../settings/components/SettingsContent'
import type { SettingsTab } from '../../settings/types'
import { useSecBoardSettings } from '../../settings/hooks/useSecBoardSettings'
import './web-settings-page.css'

function BackIcon() {
  return <ArrowLeft20Regular />
}

export function WebSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance')
  const reduceMotion = useReducedMotion()
  const settingsState = useSecBoardSettings()

  const goBack = () => {
    window.history.replaceState(null, '', '/')
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  return (
    <motion.div
      className="webSettingsPageRoot"
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={reduceMotion ? undefined : { opacity: 1 }}
      transition={reduceMotion ? undefined : { duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <header className="webSettingsPageHeader">
        <button
          type="button"
          className="webSettingsBackButton"
          onClick={goBack}
        >
          <BackIcon />
          <span>返回</span>
        </button>
        <div className={`webSettingsSaveState webSettingsSaveState--${settingsState.status}`} role="status">
          {settingsState.status === 'loading' ? '正在加载设置' : null}
          {settingsState.status === 'saving' ? '正在保存' : null}
          {settingsState.status === 'saved' ? '已保存' : null}
          {settingsState.status === 'error' ? (
            <button type="button" onClick={() => void settingsState.reload()}>保存服务不可用，点击重试</button>
          ) : null}
        </div>
      </header>

      <main className="webSettingsPageLayout">
        <SettingsSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <SettingsContent activeTab={activeTab} />
      </main>
    </motion.div>
  )
}
