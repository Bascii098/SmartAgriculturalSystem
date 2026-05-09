import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from '@/store'
import App from './App.tsx'

// leaflet-draw 需要 L 在全局作用域，必须在组件加载前设置
import L from 'leaflet'
;(window as unknown as Record<string, unknown>).L = L

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)
