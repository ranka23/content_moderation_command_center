import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import type { SettingsSection, SettingsFormProps } from '../SettingsForm'
import SettingsForm from '../SettingsForm'

describe('SettingsForm Component', () => {
  const mockSections: SettingsSection[] = [
    {
      id: 'general',
      title: 'General',
      fields: [
        {
          name: 'siteName',
          label: 'Site Name',
          type: 'text',
          placeholder: 'Enter site name',
          helpText: 'The name of your site',
        },
        {
          name: 'maxItems',
          label: 'Max Items',
          type: 'number',
          placeholder: '100',
        },
      ],
    },
    {
      id: 'notifications',
      title: 'Notifications',
      fields: [
        {
          name: 'emailAlerts',
          label: 'Email Alerts',
          type: 'toggle',
          helpText: 'Receive email alerts for new items',
        },
        {
          name: 'alertLevel',
          label: 'Alert Level',
          type: 'select',
          options: [
            { value: 'info', label: 'Info' },
            { value: 'warning', label: 'Warning' },
            { value: 'critical', label: 'Critical' },
          ],
        },
      ],
    },
    {
      id: 'advanced',
      title: 'Advanced',
      fields: [
        {
          name: 'customRules',
          label: 'Custom Rules',
          type: 'textarea',
          placeholder: 'Enter custom rules...',
          required: true,
        },
      ],
    },
  ]

  const initialValues: Record<string, unknown> = {
    siteName: 'My Site',
    maxItems: 50,
    emailAlerts: true,
    alertLevel: 'info',
    customRules: '',
  }

  const validators: Record<string, (value: unknown) => string | null> = {
    siteName: (value: unknown): string | null => {
      if (
        value === null ||
        value === undefined ||
        String(value).trim() === ''
      ) {
        return 'Site name is required'
      }
      return null
    },
    maxItems: (value: unknown): string | null => {
      const num = Number(value)
      if (Number.isNaN(num) || num < 1) {
        return 'Must be at least 1'
      }
      return null
    },
    customRules: (value: unknown): string | null => {
      if (
        value === null ||
        value === undefined ||
        String(value).trim() === ''
      ) {
        return 'Custom rules are required'
      }
      return null
    },
  }

  const defaultProps: SettingsFormProps = {
    sections: mockSections,
    onSubmit: jest.fn(),
    initialValues,
    validators,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders all section tabs', () => {
    render(<SettingsForm {...defaultProps} />)
    expect(screen.getByRole('tab', { name: /general/i })).toBeInTheDocument()
    expect(
      screen.getByRole('tab', { name: /notifications/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /advanced/i })).toBeInTheDocument()
  })

  it('shows the first section by default', () => {
    render(<SettingsForm {...defaultProps} />)
    // General tab should be active
    const generalTab = screen.getByRole('tab', { name: /general/i })
    expect(generalTab).toHaveAttribute('aria-selected', 'true')

    // General section fields should be visible
    expect(screen.getByLabelText(/site name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/max items/i)).toBeInTheDocument()
  })

  it('switches tabs when clicking on a different tab', () => {
    render(<SettingsForm {...defaultProps} />)

    // Click on Notifications tab
    fireEvent.click(screen.getByRole('tab', { name: /notifications/i }))

    const notificationsTab = screen.getByRole('tab', {
      name: /notifications/i,
    })
    expect(notificationsTab).toHaveAttribute('aria-selected', 'true')

    // General tab should no longer be active
    const generalTab = screen.getByRole('tab', { name: /general/i })
    expect(generalTab).toHaveAttribute('aria-selected', 'false')

    // Notifications fields should be visible
    expect(screen.getByLabelText(/email alerts/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/alert level/i)).toBeInTheDocument()
  })

  it('renders text input fields', () => {
    render(<SettingsForm {...defaultProps} />)
    const input = screen.getByLabelText(/site name/i)
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue('My Site')
  })

  it('renders number input fields', () => {
    render(<SettingsForm {...defaultProps} />)
    const input = screen.getByLabelText(/max items/i)
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue(50)
  })

  it('renders toggle fields', () => {
    render(<SettingsForm {...defaultProps} />)
    // Switch to notifications tab
    fireEvent.click(screen.getByRole('tab', { name: /notifications/i }))

    const toggle = screen.getByLabelText(/email alerts/i)
    expect(toggle).toBeInTheDocument()
    expect(toggle).toBeChecked()
  })

  it('renders select fields with options', () => {
    render(<SettingsForm {...defaultProps} />)
    // Switch to notifications tab
    fireEvent.click(screen.getByRole('tab', { name: /notifications/i }))

    const select = screen.getByLabelText(/alert level/i)
    expect(select).toBeInTheDocument()
    expect(select).toHaveValue('info')
  })

  it('renders textarea fields', () => {
    render(<SettingsForm {...defaultProps} />)
    // Switch to advanced tab
    fireEvent.click(screen.getByRole('tab', { name: /advanced/i }))

    const textarea = screen.getByLabelText(/custom rules/i)
    expect(textarea).toBeInTheDocument()
    expect(textarea).toHaveValue('')
  })

  it('shows help text for fields', () => {
    render(<SettingsForm {...defaultProps} />)
    expect(screen.getByText(/the name of your site/i)).toBeInTheDocument()
  })

  it('shows required indicator on required fields', () => {
    render(<SettingsForm {...defaultProps} />)
    // Switch to advanced tab
    fireEvent.click(screen.getByRole('tab', { name: /advanced/i }))

    // The label should have an asterisk
    const advancedTabPanel = screen.getByRole('tabpanel')
    expect(advancedTabPanel.textContent).toContain('*')
  })

  it('validates field on blur', () => {
    render(<SettingsForm {...defaultProps} />)

    const input = screen.getByLabelText(/site name/i)
    // Clear the value
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.blur(input)

    expect(screen.getByText(/site name is required/i)).toBeInTheDocument()
  })

  it('shows error style on invalid fields', () => {
    render(<SettingsForm {...defaultProps} />)

    const input = screen.getByLabelText(/site name/i)
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.blur(input)

    // Input should have aria-invalid
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('does not submit when validation fails', () => {
    const onSubmit = jest.fn()
    render(
      <SettingsForm
        {...defaultProps}
        onSubmit={onSubmit}
        initialValues={{
          siteName: '',
          maxItems: 0,
          emailAlerts: false,
          alertLevel: '',
          customRules: '',
        }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits with correct data when validation passes', () => {
    const onSubmit = jest.fn()
    render(
      <SettingsForm
        {...defaultProps}
        onSubmit={onSubmit}
        initialValues={{
          siteName: 'My Site',
          maxItems: 50,
          emailAlerts: true,
          alertLevel: 'info',
          customRules: 'some rules',
        }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith({
      siteName: 'My Site',
      maxItems: 50,
      emailAlerts: true,
      alertLevel: 'info',
      customRules: 'some rules',
    })
  })

  it('detects dirty state after changing a field', () => {
    render(<SettingsForm {...defaultProps} />)

    const input = screen.getByLabelText(/site name/i)
    fireEvent.change(input, { target: { value: 'New Site Name' } })

    // Reset button should be enabled when form is dirty
    const resetButton = screen.getByRole('button', { name: /reset/i })
    expect(resetButton).not.toBeDisabled()
  })

  it('resets to initial values on reset', () => {
    render(<SettingsForm {...defaultProps} />)

    const input = screen.getByLabelText(/site name/i)
    fireEvent.change(input, { target: { value: 'Changed' } })
    expect(input).toHaveValue('Changed')

    fireEvent.click(screen.getByRole('button', { name: /reset/i }))

    expect(input).toHaveValue('My Site')
  })

  it('shows submitting state when isSubmitting is true', () => {
    render(<SettingsForm {...defaultProps} isSubmitting />)

    expect(screen.getByRole('button', { name: /saving/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled()
  })

  it('disables reset button when form is not dirty', () => {
    render(<SettingsForm {...defaultProps} />)

    const resetButton = screen.getByRole('button', { name: /reset/i })
    expect(resetButton).toBeDisabled()
  })

  it('uses custom submit label', () => {
    render(<SettingsForm {...defaultProps} submitLabel="Update Settings" />)

    expect(
      screen.getByRole('button', { name: /update settings/i }),
    ).toBeInTheDocument()
  })

  it('shows empty state when no sections provided', () => {
    render(<SettingsForm {...defaultProps} sections={[]} />)

    expect(
      screen.getByText(/no settings sections available/i),
    ).toBeInTheDocument()
  })

  it('shows help text only when no error is present', () => {
    render(<SettingsForm {...defaultProps} />)

    // Help text should be visible initially
    expect(screen.getByText(/the name of your site/i)).toBeInTheDocument()

    const input = screen.getByLabelText(/site name/i)
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.blur(input)

    // Help text should be replaced by error
    expect(screen.queryByText(/the name of your site/i)).not.toBeInTheDocument()
    expect(screen.getByText(/site name is required/i)).toBeInTheDocument()
  })

  it('renders correct tabpanel id', () => {
    render(<SettingsForm {...defaultProps} />)

    const panel = screen.getByRole('tabpanel')
    expect(panel).toHaveAttribute('id', 'cmcc-panel-general')
  })

  it('shows tabpanel for active section only', () => {
    render(<SettingsForm {...defaultProps} />)

    // Only one tabpanel should be visible
    const panels = screen.getAllByRole('tabpanel')
    expect(panels).toHaveLength(1)
    expect(panels[0]).toHaveAttribute('id', 'cmcc-panel-general')

    // Switch tab
    fireEvent.click(screen.getByRole('tab', { name: /notifications/i }))
    const newPanels = screen.getAllByRole('tabpanel')
    expect(newPanels).toHaveLength(1)
    expect(newPanels[0]).toHaveAttribute('id', 'cmcc-panel-notifications')
  })

  it('validates all fields on submit', () => {
    const onSubmit = jest.fn()
    render(
      <SettingsForm
        {...defaultProps}
        onSubmit={onSubmit}
        initialValues={{
          siteName: '',
          maxItems: 0,
          emailAlerts: false,
          alertLevel: '',
          customRules: '',
        }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

    // Errors should show across all tabs
    expect(screen.getByText(/site name is required/i)).toBeInTheDocument()
    expect(screen.getByText(/must be at least 1/i)).toBeInTheDocument()

    // Errors for fields in other tabs should be stored in state
    // but not visible until we switch to those tabs
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows 0 in number field when value is 0', () => {
    render(
      <SettingsForm
        {...defaultProps}
        initialValues={{
          ...initialValues,
          maxItems: 0,
        }}
      />,
    )

    const input = screen.getByLabelText(/max items/i)
    expect(input).toHaveValue(0)
  })
})
