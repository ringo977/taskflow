import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FormSubmitModal from './FormSubmitModal'

// Mock i18n
vi.mock('@/i18n', () => ({
  useLang: () => ({})
}))

const makeForm = (fields, opts = {}) => ({
  id: 'f1',
  name: opts.name ?? 'Test Form',
  description: opts.description ?? '',
  defaultSection: opts.defaultSection ?? 'To Do',
  fields,
})

const textField = (id, label, mapsTo = 'none', opts = {}) => ({
  id, label, type: 'text', mapsTo, required: false, ...opts,
})

describe('FormSubmitModal', () => {
  const sections = ['To Do', 'In Progress', 'Done']

  it('renders form name and description', () => {
    const form = makeForm([], { name: 'Bug Report', description: 'Report a bug' })
    render(<FormSubmitModal form={form} sections={sections} onSubmit={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('Bug Report')).toBeInTheDocument()
    expect(screen.getByText('Report a bug')).toBeInTheDocument()
  })

  it('renders all field types', () => {
    const fields = [
      { id: 'f1', label: 'Name', type: 'text', mapsTo: 'title', required: false },
      { id: 'f2', label: 'Desc', type: 'textarea', mapsTo: 'desc', required: false },
      { id: 'f3', label: 'Priority', type: 'select', mapsTo: 'pri', options: 'low,medium,high', required: false },
      { id: 'f4', label: 'Due', type: 'date', mapsTo: 'due', required: false },
      { id: 'f5', label: 'Estimate', type: 'number', mapsTo: 'none', required: false },
      { id: 'f6', label: 'Agree', type: 'checkbox', mapsTo: 'none', required: false },
      { id: 'f7', label: 'Website', type: 'url', mapsTo: 'none', required: false },
      { id: 'f8', label: 'Contact', type: 'email', mapsTo: 'none', required: false },
    ]
    const form = makeForm(fields)
    render(<FormSubmitModal form={form} sections={sections} onSubmit={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Desc')).toBeInTheDocument()
    expect(screen.getByText('Priority')).toBeInTheDocument()
    expect(screen.getByText('Due')).toBeInTheDocument()
    expect(screen.getByText('Estimate')).toBeInTheDocument()
    expect(screen.getAllByText('Agree').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Website')).toBeInTheDocument()
    expect(screen.getByText('Contact')).toBeInTheDocument()
  })

  it('submits with mapped fields', () => {
    const onSubmit = vi.fn()
    const fields = [
      textField('f1', 'Title', 'title'),
      textField('f2', 'Assigned to', 'who'),
    ]
    const form = makeForm(fields)
    render(<FormSubmitModal form={form} sections={sections} onSubmit={onSubmit} onClose={vi.fn()} />)

    const inputs = screen.getAllByRole('textbox')
    fireEvent.change(inputs[0], { target: { value: 'My Bug' } })
    fireEvent.change(inputs[1], { target: { value: 'Alice' } })
    fireEvent.click(screen.getByText('Submit'))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const task = onSubmit.mock.calls[0][0]
    expect(task.title).toBe('My Bug')
    expect(task.who).toBe('Alice')
    expect(task.sec).toBe('To Do')
  })

  it('validates required fields', () => {
    const onSubmit = vi.fn()
    const fields = [
      textField('f1', 'Title', 'title', { required: true }),
    ]
    const form = makeForm(fields)
    render(<FormSubmitModal form={form} sections={sections} onSubmit={onSubmit} onClose={vi.fn()} />)

    // Submit without filling required field
    fireEvent.click(screen.getByText('Submit'))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText('This field is required')).toBeInTheDocument()
  })

  it('validates required checkbox must be checked', () => {
    const onSubmit = vi.fn()
    const fields = [
      { id: 'f1', label: 'Agree', type: 'checkbox', mapsTo: 'none', required: true },
    ]
    const form = makeForm(fields)
    render(<FormSubmitModal form={form} sections={sections} onSubmit={onSubmit} onClose={vi.fn()} />)

    fireEvent.click(screen.getByText('Submit'))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('appends unmapped fields to description', () => {
    const onSubmit = vi.fn()
    const fields = [
      textField('f1', 'Title', 'title'),
      textField('f2', 'Extra Info', 'none'),
    ]
    const form = makeForm(fields)
    render(<FormSubmitModal form={form} sections={sections} onSubmit={onSubmit} onClose={vi.fn()} />)

    const inputs = screen.getAllByRole('textbox')
    fireEvent.change(inputs[0], { target: { value: 'Task Title' } })
    fireEvent.change(inputs[1], { target: { value: 'Some extra data' } })
    fireEvent.click(screen.getByText('Submit'))

    const task = onSubmit.mock.calls[0][0]
    expect(task.title).toBe('Task Title')
    expect(task.desc).toContain('Extra Info')
    expect(task.desc).toContain('Some extra data')
  })

  it('generates fallback title when no title field', () => {
    const onSubmit = vi.fn()
    const fields = [
      textField('f1', 'Notes', 'desc'),
    ]
    const form = makeForm(fields, { name: 'Quick Note' })
    render(<FormSubmitModal form={form} sections={sections} onSubmit={onSubmit} onClose={vi.fn()} />)

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'hello' } })
    fireEvent.click(screen.getByText('Submit'))

    const task = onSubmit.mock.calls[0][0]
    expect(task.title).toContain('Quick Note')
  })

  it('uses defaultSection from form', () => {
    const onSubmit = vi.fn()
    const fields = [textField('f1', 'Title', 'title')]
    const form = makeForm(fields, { defaultSection: 'In Progress' })
    render(<FormSubmitModal form={form} sections={sections} onSubmit={onSubmit} onClose={vi.fn()} />)

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Test' } })
    fireEvent.click(screen.getByText('Submit'))

    expect(onSubmit.mock.calls[0][0].sec).toBe('In Progress')
  })

  it('calls onClose when cancel clicked', () => {
    const onClose = vi.fn()
    const form = makeForm([])
    render(<FormSubmitModal form={form} sections={sections} onSubmit={vi.fn()} onClose={onClose} />)

    fireEvent.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when overlay clicked', () => {
    const onClose = vi.fn()
    const form = makeForm([])
    const { container } = render(<FormSubmitModal form={form} sections={sections} onSubmit={vi.fn()} onClose={onClose} />)

    // Click the overlay (first child)
    fireEvent.click(container.firstChild)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('pre-fills default values', () => {
    const fields = [
      textField('f1', 'Title', 'title', { defaultValue: 'Default Title' }),
    ]
    const form = makeForm(fields)
    render(<FormSubmitModal form={form} sections={sections} onSubmit={vi.fn()} onClose={vi.fn()} />)

    const input = screen.getByRole('textbox')
    expect(input.value).toBe('Default Title')
  })

  it('clears validation error on field change', () => {
    const fields = [
      textField('f1', 'Title', 'title', { required: true }),
    ]
    const form = makeForm(fields)
    render(<FormSubmitModal form={form} sections={sections} onSubmit={vi.fn()} onClose={vi.fn()} />)

    fireEvent.click(screen.getByText('Submit'))
    expect(screen.getByText('This field is required')).toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'ok' } })
    expect(screen.queryByText('This field is required')).not.toBeInTheDocument()
  })

  it('maps priority field correctly', () => {
    const onSubmit = vi.fn()
    const fields = [
      { id: 'f1', label: 'Priority', type: 'select', mapsTo: 'pri', options: 'low,medium,high', required: false },
    ]
    const form = makeForm(fields)
    render(<FormSubmitModal form={form} sections={sections} onSubmit={onSubmit} onClose={vi.fn()} />)

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'high' } })
    fireEvent.click(screen.getByText('Submit'))

    expect(onSubmit.mock.calls[0][0].pri).toBe('high')
  })
})
