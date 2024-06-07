import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

declare global {
    interface Window {
        arweaveWallet: {
            connect: (permissions: string[]) => Promise<void>
            getActiveAddress: () => Promise<string>
            disconnect: () => Promise<void>
        }
    }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
