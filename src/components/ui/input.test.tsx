import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Input } from './input'

vi.mock('@base-ui/react/input', () => ({
  Input: ({ className, ...props }: React.ComponentProps<'input'>) => (
    <input className={className} {...props} />
  ),
}))

describe('Input component', () => {
  it('renders an input element', () => {
    render(<Input placeholder="Type here" />)
    expect(screen.getByPlaceholderText('Type here')).toBeInTheDocument()
  })

  it('calls onChange when user types', () => {
    const onChange = vi.fn()
    render(<Input onChange={onChange} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hello' } })
    expect(onChange).toHaveBeenCalled()
  })

  it('is disabled when disabled prop is set', () => {
    render(<Input disabled />)
    expect(screen.getByRole('textbox')).toBeDisabled()
  })

  it('renders with the correct type attribute', () => {
    render(<Input type="number" data-testid="num-input" />)
    expect(screen.getByTestId('num-input')).toHaveAttribute('type', 'number')
  })

  it('applies aria-label', () => {
    render(<Input aria-label="Course name" />)
    expect(screen.getByRole('textbox', { name: 'Course name' })).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<Input className="extra-class" />)
    expect(screen.getByRole('textbox')).toHaveClass('extra-class')
  })
})
