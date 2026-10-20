import { PRIORITIES, PRIORITY_ICON } from '../constants/priority'
import { useAppContext } from '../contexts/AppContext'

// 高/中/低の選択 UI。選択中のボタンを再タップすると解除（= 未設定 null）。
export default function PrioritySelector({ value, onChange }) {
  const { t } = useAppContext()
  const p = t.priority

  return (
    <div className="priority-selector" role="group" aria-label={p.label}>
      {PRIORITIES.map(key => {
        const selected = value === key
        return (
          <button
            key={key}
            type="button"
            className={`priority-option prio-${key}${selected ? ' selected' : ''}`}
            aria-pressed={selected}
            aria-label={p.aria.replace('{level}', p[key])}
            onClick={() => onChange(selected ? null : key)}
          >
            <i className={`fa-solid ${PRIORITY_ICON[key]}`} aria-hidden="true" />
            <span>{p[key]}</span>
          </button>
        )
      })}
    </div>
  )
}
