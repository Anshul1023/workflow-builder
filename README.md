# Workflow Builder

A visual workflow builder for creating intelligent data processing pipelines. Design, configure, and execute workflows through an intuitive drag-and-drop interface.

## Features

- **Visual Workflow Canvas**: Drag-and-drop interface powered by React Flow
- **Four Core Components**:
  - **User Query**: Entry point for user inputs
  - **Knowledge Base**: Document processing and vector-based retrieval
  - **LLM Engine**: Language model integration for intelligent responses
  - **Output**: Response display in chat format
- **Real-time Validation**: Automatic workflow validation with error reporting
- **Configuration Panel**: Dynamic settings for each component
- **Chat Interface**: Interactive testing of your workflows

## Tech Stack

- React.js with TypeScript
- React Flow for visual workflow editing
- Zustand for state management
- Tailwind CSS for styling
- Vite for build tooling

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Open `http://localhost:5173`

## Building Workflows

1. Drag components from the left panel onto the canvas
2. Connect components by dragging from output handles to input handles
3. Click on any component to configure its settings
4. Use the "Validate" button to check your workflow
5. Click "Chat with Workflow" to test your pipeline

## Component Configuration

### User Query
- Input placeholder text
- Maximum character length

### Knowledge Base
- Embedding model selection (OpenAI, Gemini, Cohere)
- Chunk size for document processing
- Top K results for retrieval
- Context passing toggle

### LLM Engine
- Model selection (GPT-4, GPT-3.5, Gemini Pro, Claude 3)
- System prompt customization
- Temperature control
- Web search integration

### Output
- Output format (Plain Text, Markdown, JSON)
- Response streaming toggle

## License

MIT License
