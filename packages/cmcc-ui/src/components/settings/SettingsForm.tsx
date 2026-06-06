import { useState, type ChangeEvent } from 'react'

export interface SettingsField {
  name: string
  label: string
  type: 'text' | 'number' | 'select' | 'toggle' | 'textarea'
  placeholder?: string
  options?: { value: string; label: string }[]
  helpText?: string
  required?: boolean
}

export interface SettingsSection {
  id: string
  title: string
  fields: SettingsField[]
}

export interface SettingsFormProps {
  sections: SettingsSection[]
  onSubmit: (formData: Record<string, unknown>) => void
  initialValues: Record<string, unknown>
  validators: Record<string, (value: unknown) => string | null>
  submitLabel?: string
  isSubmitting?: boolean
}

function validateField(
  name: string,
  value: unknown,
  validators: Record<string, (value: unknown) => string | null>,
): string | null {
  const validator = validators[name]
  if (validator) {
    return validator(value)
  }
  return null
}

function renderFieldInput(
  field: SettingsField,
  value: unknown,
  error: string | null,
  onChange: (name: string, value: unknown) => void,
  onBlur: (name: string) => void,
): React.ReactNode {
  const baseInputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    border: `1px solid ${error ? '#dc2626' : '#d1d5db'}`,
    borderRadius: '6px',
    fontSize: '14px',
    lineHeight: 1.5,
    boxSizing: 'border-box',
  }

  const fieldId = `cmcc-field-${field.name}`

  switch (field.type) {
    case 'text':
    case 'number': {
      const strValue =
        value === null || value === undefined ? '' : String(value)
      return (
        <input
          id={fieldId}
          type={field.type === 'number' ? 'number' : 'text'}
          name={field.name}
          value={strValue}
          placeholder={field.placeholder}
          onChange={(e: ChangeEvent<HTMLInputElement>): void => {
            const newValue =
              field.type === 'number' ? Number(e.target.value) : e.target.value
            onChange(field.name, newValue)
          }}
          onBlur={(): void => {
            onBlur(field.name)
          }}
          style={baseInputStyle}
          aria-invalid={error !== null}
          aria-describedby={error ? `${fieldId}-error` : undefined}
        />
      )
    }

    case 'select': {
      const strValue =
        value === null || value === undefined ? '' : String(value)
      return (
        <select
          id={fieldId}
          name={field.name}
          value={strValue}
          onChange={(e: ChangeEvent<HTMLSelectElement>): void => {
            onChange(field.name, e.target.value)
          }}
          onBlur={(): void => {
            onBlur(field.name)
          }}
          style={{
            ...baseInputStyle,
            appearance: 'auto',
          }}
          aria-invalid={error !== null}
        >
          {field.options?.map(
            (opt: { value: string; label: string }): React.ReactElement => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ),
          )}
        </select>
      )
    }

    case 'textarea': {
      const strValue =
        value === null || value === undefined ? '' : String(value)
      return (
        <textarea
          id={fieldId}
          name={field.name}
          value={strValue}
          placeholder={field.placeholder}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>): void => {
            onChange(field.name, e.target.value)
          }}
          onBlur={(): void => {
            onBlur(field.name)
          }}
          style={{
            ...baseInputStyle,
            minHeight: '80px',
            resize: 'vertical',
          }}
          aria-invalid={error !== null}
          aria-describedby={error ? `${fieldId}-error` : undefined}
        />
      )
    }

    case 'toggle': {
      const boolValue = Boolean(value)
      return (
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
          }}
        >
          <input
            id={fieldId}
            type="checkbox"
            name={field.name}
            checked={boolValue}
            onChange={(e: ChangeEvent<HTMLInputElement>): void => {
              onChange(field.name, e.target.checked)
            }}
            onBlur={(): void => {
              onBlur(field.name)
            }}
            aria-invalid={error !== null}
          />
          <span>{field.label}</span>
        </label>
      )
    }
  }
}

export function SettingsForm({
  sections,
  onSubmit,
  initialValues,
  validators,
  submitLabel = 'Save Changes',
  isSubmitting = false,
}: SettingsFormProps): React.ReactElement {
  const firstTabId = sections[0]?.id ?? ''
  const [activeTab, setActiveTab] = useState<string>(firstTabId)
  const [values, setValues] = useState<Record<string, unknown>>(initialValues)
  const [dirtyFields, setDirtyFields] = useState<Set<string>>(new Set())
  const [errors, setErrors] = useState<Record<string, string | null>>({})

  const isDirty = dirtyFields.size > 0

  const handleFieldChange = (name: string, value: unknown): void => {
    setValues((prev: Record<string, unknown>): Record<string, unknown> => {
      const next = { ...prev }
      next[name] = value
      return next
    })
    setDirtyFields(
      (prev: Set<string>): Set<string> => new Set<string>(prev).add(name),
    )
  }

  const handleBlur = (name: string): void => {
    const currentValues = values
    const currentValue = currentValues[name]
    const error = validateField(name, currentValue, validators)
    setErrors(
      (prev: Record<string, string | null>): Record<string, string | null> => {
        const next = { ...prev }
        next[name] = error
        return next
      },
    )
  }

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()

    const newErrors: Record<string, string | null> = {}
    let hasError = false

    for (const section of sections) {
      for (const field of section.fields) {
        const fieldValue = values[field.name]
        const error = validateField(field.name, fieldValue, validators)
        newErrors[field.name] = error
        if (error !== null) {
          hasError = true
        }
      }
    }

    setErrors(newErrors)

    if (!hasError) {
      onSubmit(values)
    }
  }

  const handleReset = (): void => {
    setValues({ ...initialValues })
    setDirtyFields(new Set<string>())
    setErrors({})
  }

  const activeSection = sections.find(
    (s: SettingsSection): boolean => s.id === activeTab,
  )

  return (
    <form
      onSubmit={handleSubmit}
      className="cmcc-settings-form"
      style={{ fontFamily: 'system-ui, sans-serif' }}
    >
      {/* Tab navigation */}
      <div
        role="tablist"
        style={{
          display: 'flex',
          borderBottom: '2px solid #e5e7eb',
          marginBottom: '24px',
          gap: '4px',
        }}
      >
        {sections.map((section: SettingsSection): React.ReactElement => {
          const isActive = section.id === activeTab
          return (
            <button
              key={section.id}
              role="tab"
              type="button"
              aria-selected={isActive}
              aria-controls={`cmcc-panel-${section.id}`}
              onClick={(): void => {
                setActiveTab(section.id)
              }}
              style={{
                padding: '10px 20px',
                border: 'none',
                borderBottom: isActive
                  ? '2px solid #2563eb'
                  : '2px solid transparent',
                marginBottom: '-2px',
                backgroundColor: 'transparent',
                color: isActive ? '#2563eb' : '#6b7280',
                fontWeight: isActive ? 600 : 400,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              {section.title}
            </button>
          )
        })}
      </div>

      {/* Active section fields */}
      {activeSection && (
        <div
          role="tabpanel"
          id={`cmcc-panel-${activeSection.id}`}
          style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
        >
          {activeSection.fields.map(
            (field: SettingsField): React.ReactElement => {
              const fieldError = errors[field.name]
              const isToggle = field.type === 'toggle'

              return (
                <div
                  key={field.name}
                  style={{
                    display: 'flex',
                    flexDirection: isToggle ? 'row' : 'column',
                    alignItems: isToggle ? 'center' : undefined,
                    gap: isToggle ? '0' : '6px',
                    justifyContent: isToggle ? 'space-between' : undefined,
                  }}
                >
                  {/* Label - not shown inline for toggle since it's in the label */}
                  {!isToggle && (
                    <label
                      htmlFor={`cmcc-field-${field.name}`}
                      style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        color: '#374151',
                      }}
                    >
                      {field.label}
                      {field.required && (
                        <span
                          aria-hidden="true"
                          style={{ color: '#dc2626', marginLeft: '2px' }}
                        >
                          *
                        </span>
                      )}
                    </label>
                  )}

                  {/* Input */}
                  {renderFieldInput(
                    field,
                    values[field.name],
                    fieldError ?? null,
                    handleFieldChange,
                    handleBlur,
                  )}

                  {/* Help text */}
                  {field.helpText && !fieldError && (
                    <span
                      style={{
                        fontSize: '12px',
                        color: '#6b7280',
                        marginTop: '2px',
                      }}
                    >
                      {field.helpText}
                    </span>
                  )}

                  {/* Error message */}
                  {fieldError && (
                    <span
                      id={`cmcc-field-${field.name}-error`}
                      role="alert"
                      style={{
                        fontSize: '12px',
                        color: '#dc2626',
                        marginTop: '2px',
                      }}
                    >
                      {fieldError}
                    </span>
                  )}
                </div>
              )
            },
          )}
        </div>
      )}

      {/* No active section found */}
      {!activeSection && sections.length > 0 && (
        <div style={{ color: '#6b7280', padding: '20px 0' }}>
          Select a section to view settings.
        </div>
      )}

      {/* Empty state */}
      {sections.length === 0 && (
        <div style={{ color: '#6b7280', padding: '20px 0' }}>
          No settings sections available.
        </div>
      )}

      {/* Form actions */}
      {sections.length > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            marginTop: '32px',
            paddingTop: '16px',
            borderTop: '1px solid #e5e7eb',
          }}
        >
          <button
            type="button"
            onClick={handleReset}
            disabled={!isDirty || isSubmitting}
            style={{
              padding: '8px 20px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              backgroundColor: '#ffffff',
              color: '#374151',
              fontSize: '14px',
              fontWeight: 500,
              cursor: !isDirty || isSubmitting ? 'not-allowed' : 'pointer',
              opacity: !isDirty || isSubmitting ? 0.5 : 1,
            }}
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: '8px 20px',
              borderRadius: '6px',
              border: '1px solid #2563eb',
              backgroundColor: isSubmitting ? '#93c5fd' : '#2563eb',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? 'Saving...' : submitLabel}
          </button>
        </div>
      )}
    </form>
  )
}

export default SettingsForm
