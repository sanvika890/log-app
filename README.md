# Intelligent Log File Analyzer

A web-based application for analyzing log files with configurable rules and pattern matching. The application provides insights into log patterns, error frequencies, and time-based analytics.

## Features

- Upload and analyze log files (supports .log and .txt files)
- Configurable pattern matching rules via YAML
- Real-time log analysis with streaming support
- Error and warning detection
- Time-based analytics
- User-friendly web interface with drag-and-drop
- File size limit: 50MB

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation

1. Clone the repository:
   ```bash
   git clone <your-repository-url>
   cd log-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Running the Application

1. Development mode (with auto-reload):
   ```bash
   npm run dev
   ```

2. Production mode:
   ```bash
   npm start
   ```

3. Access the application:
   Open your browser and navigate to `http://localhost:8080`

## Configuration

Log analysis rules are configured in `config/rules.yaml`. Example configuration:

```yaml
rules:
  - name: "Error Detection"
    pattern: "ERROR|FAILURE|failed|exception"
    tag: "error"
    priority: "high"
  
  - name: "Warning Detection"
    pattern: "WARN|warning"
    tag: "warning"
    priority: "medium"
```

## API Endpoints

- `POST /api/analyze`: Upload and analyze log files
  - Accepts multipart/form-data with a file field named 'logFile'
  - Returns analysis results including time range, log levels, and matched patterns


## Running Tests

```bash
npm test
```

## License

ISC
