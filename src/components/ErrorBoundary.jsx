import { Component } from 'react'
import { STORAGE_KEY } from '../store/defaults.js'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Erro na aplicação', error, info)
  }

  exportData = () => {
    const data = localStorage.getItem(STORAGE_KEY) || '{}'
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'financas-backup.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="mx-auto mt-16 max-w-md rounded-2xl bg-white p-6 text-center shadow ring-1 ring-slate-200">
        <h1 className="text-lg font-semibold text-red-600">Algo deu errado</h1>
        <p className="mt-2 text-sm text-slate-600">{String(this.state.error?.message || this.state.error)}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white" onClick={() => this.setState({ error: null })}>Tentar novamente</button>
          <button className="rounded-xl bg-slate-100 px-4 py-2 text-sm" onClick={this.exportData}>Baixar backup</button>
          <button
            className="rounded-xl bg-red-600 px-4 py-2 text-sm text-white"
            onClick={() => {
              if (window.confirm('Apagar todos os dados salvos e recomeçar?')) {
                localStorage.removeItem(STORAGE_KEY)
                window.location.reload()
              }
            }}
          >
            Reiniciar dados
          </button>
        </div>
      </div>
    )
  }
}
