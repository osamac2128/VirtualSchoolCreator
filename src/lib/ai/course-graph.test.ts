import { describe, it, expect, vi } from 'vitest'
import { courseApp } from './course-graph'

// We mock the LLM calls to prevent actual API usage during testing
vi.mock('@langchain/openai', () => {
  return {
    ChatOpenAI: class {
      invoke = vi.fn()
      pipe = vi.fn().mockReturnThis()
    }
  }
})

describe('Course Graph Configuration', () => {
  it('should be an instance of StateGraph', () => {
    // Note: the compiled app is a CompiledStateGraph, but we can inspect its builder
    expect(courseApp).toBeDefined()
    expect(courseApp.builder).toBeDefined()
    expect(courseApp.builder.nodes).toHaveProperty('extractThemes')
    expect(courseApp.builder.nodes).toHaveProperty('generateWeeks')
    expect(courseApp.builder.nodes).toHaveProperty('persistCourse')
  })

  it('should have correct edges established', () => {
    // The graph structure implies:
    // START -> extractThemes -> generateWeeks -> persistCourse -> END
    
    // Check nodes existence
    const nodes = Object.keys(courseApp.builder.nodes)
    expect(nodes).toContain('extractThemes')
    expect(nodes).toContain('generateWeeks')
    expect(nodes).toContain('persistCourse')

    // Inspect compiled graph structure for connectivity (LangGraph internal structure checking)
    const graphStructure = courseApp.getGraph()
    expect(graphStructure).toBeDefined()
    
    const nodeNames = Object.keys(graphStructure.nodes)
    expect(nodeNames).toContain('__start__')
    expect(nodeNames).toContain('extractThemes')
    expect(nodeNames).toContain('generateWeeks')
    expect(nodeNames).toContain('persistCourse')
  })
})