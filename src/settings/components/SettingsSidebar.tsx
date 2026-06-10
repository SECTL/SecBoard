import {
  WeatherSunny20Regular,
  Toolbox20Regular,
  Grid20Regular,
  Edit20Regular,
  Whiteboard20Regular,
  Video20Regular,
  SlideText20Regular,
  Info20Regular,
  Settings20Regular,
} from '@fluentui/react-icons'
import React from 'react'
import { motion } from '../../Framer_Motion'
import type { SettingsTab, SettingsTabItem } from '../types'
import { MotionButton } from '../../button'
import './SettingsSidebar.css'

const TabIcons: Record<SettingsTab, React.ReactNode> = {
  appearance: <WeatherSunny20Regular />,
  toolbar: <Toolbox20Regular />,
  'feature-panel': <Grid20Regular />,
  annotation: <Edit20Regular />,
  whiteboard: <Whiteboard20Regular />,
  'video-show': <Video20Regular />,
  'lanstart-bar': <SlideText20Regular />,
  about: <Info20Regular />,
}

const tabs: SettingsTabItem[] = [
  { id: 'appearance', label: '外观', icon: TabIcons.appearance },
  { id: 'toolbar', label: '浮动工具栏', icon: TabIcons.toolbar },
  { id: 'feature-panel', label: '功能面板', icon: TabIcons['feature-panel'] },
  { id: 'annotation', label: '批注系统', icon: TabIcons.annotation },
  { id: 'whiteboard', label: '白板', icon: TabIcons.whiteboard },
  { id: 'video-show', label: '视频展台', icon: TabIcons['video-show'] },
  { id: 'lanstart-bar', label: 'LanStartBar', icon: TabIcons['lanstart-bar'] },
  { id: 'about', label: '关于', icon: TabIcons.about },
]

interface SettingsSidebarProps {
  activeTab: SettingsTab
  onTabChange: (tab: SettingsTab) => void
}

export function SettingsSidebar({ activeTab, onTabChange }: SettingsSidebarProps) {
  return (
    <div className="settingsSidebar">
      {/* 标题区域 */}
      <div className="settingsSidebarHeader">
        <motion.div
          className="settingsSidebarLogo"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="settingsSidebarLogoIcon">
            <Settings20Regular style={{ fontSize: 28 }} />
          </div>
          <span className="settingsSidebarTitle">设置</span>
        </motion.div>
      </div>

      {/* 选项列表 */}
      <nav className="settingsSidebarNav">
        {tabs.map((tab, index) => (
          <MotionButton
            key={tab.id}
            kind="custom"
            ariaLabel={tab.label}
            className={`settingsSidebarTab ${activeTab === tab.id ? 'settingsSidebarTab--active' : ''}`}
            onClick={() => onTabChange(tab.id)}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="settingsSidebarTabIcon">{tab.icon}</span>
            <span className="settingsSidebarTabLabel">{tab.label}</span>
          </MotionButton>
        ))}
      </nav>

      {/* 底部信息 */}
      <div className="settingsSidebarFooter">
        <span className="settingsSidebarVersion">SecBoard v{__APP_VERSION__}</span>
      </div>
    </div>
  )
}

