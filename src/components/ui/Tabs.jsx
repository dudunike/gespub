// Componente Tabs — abas de navegação

import { useState } from 'react'

export default function Tabs({ tabs, activeTab, onTabChange, className = '' }) {
  return (
    <div className={`flex gap-1 border-b border-border ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            px-4 py-2 text-sm font-medium
            border-b-2 -mb-px
            transition-all duration-150
            ${activeTab === tab.id
              ? 'border-brand-500 text-brand-500'
              : 'border-transparent text-txt-secondary hover:text-txt-primary hover:border-border'
            }
          `}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-md ${
              activeTab === tab.id ? 'bg-brand-50 text-brand-500' : 'bg-surface-bg text-txt-secondary'
            }`}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
