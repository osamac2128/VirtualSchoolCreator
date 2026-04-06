import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './card'

describe('Card component suite', () => {
  it('renders Card with children', () => {
    render(<Card>Card body</Card>)
    expect(screen.getByText('Card body')).toBeInTheDocument()
  })

  it('Card has the correct data-slot attribute', () => {
    const { container } = render(<Card>Test</Card>)
    expect(container.querySelector('[data-slot="card"]')).not.toBeNull()
  })

  it('renders CardHeader with CardTitle and CardDescription', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>My Title</CardTitle>
          <CardDescription>Some description</CardDescription>
        </CardHeader>
      </Card>
    )
    expect(screen.getByText('My Title')).toBeInTheDocument()
    expect(screen.getByText('Some description')).toBeInTheDocument()
  })

  it('renders CardContent inside Card', () => {
    const { container } = render(
      <Card>
        <CardContent>Content area</CardContent>
      </Card>
    )
    expect(screen.getByText('Content area')).toBeInTheDocument()
    expect(container.querySelector('[data-slot="card-content"]')).not.toBeNull()
  })

  it('renders CardFooter inside Card', () => {
    render(
      <Card>
        <CardFooter>Footer</CardFooter>
      </Card>
    )
    expect(screen.getByText('Footer')).toBeInTheDocument()
  })

  it('applies custom className to Card', () => {
    const { container } = render(<Card className="custom">Body</Card>)
    expect(container.querySelector('.custom')).not.toBeNull()
  })

  it('renders a full card composition', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Upload Course</CardTitle>
          <CardDescription>Upload your curriculum file.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Form goes here</p>
        </CardContent>
        <CardFooter>
          <button>Submit</button>
        </CardFooter>
      </Card>
    )
    expect(screen.getByText('Upload Course')).toBeInTheDocument()
    expect(screen.getByText('Upload your curriculum file.')).toBeInTheDocument()
    expect(screen.getByText('Form goes here')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument()
  })
})
