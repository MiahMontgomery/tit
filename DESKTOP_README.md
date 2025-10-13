# Titan Desktop Application

A powerful AI project management system with voice integration, autonomous agents, and real-time collaboration.

## Features

### 🤖 Autonomous AI Agents
- **Jason**: Your personal AI project manager with voice communication
- **Self-prioritizing todo lists** that adapt to project needs
- **Executive decision making** with 2-hour timeout for human input
- **24/7 autonomous operation** with continuous optimization

### 🎙️ Voice Integration
- **Real-time voice communication** with Jason via ElevenLabs
- **Voice-to-text transcription** for seamless input
- **Audio status updates** with natural speech synthesis
- **Voice call simulation** with live conversation

### 📊 Comprehensive Project Management
- **Progress Tab**: Nested Features → Milestones → Goals structure
- **Input Tab**: Replit-style chat with nested notifications and screenshots
- **Logs Tab**: Complete activity history and system events
- **Output Tab**: Content approval system with live browser controls
- **Sales Tab**: Revenue tracking and performance metrics
- **Code Tab**: Full file system access and code editing (Desktop only)

### 🖥️ Desktop-Specific Features
- **File System Access**: Direct access to project files and code
- **Code Editor**: Built-in editor with syntax highlighting
- **Project Export**: Export projects as downloadable packages
- **Offline Operation**: Work without internet connection
- **Native Performance**: Optimized for desktop use

## Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/titan.git
   cd titan
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the desktop application**
   ```bash
   ./build-desktop.sh
   ```

4. **Run the desktop application**
   ```bash
   npm run electron:dev
   ```

### Development Mode

For development with hot reload:

```bash
# Terminal 1: Start the backend server
npm run dev

# Terminal 2: Start the desktop app
npm run electron:dev
```

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# ElevenLabs API Key (for voice features)
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# Jason's Voice ID (optional)
JASON_VOICE_ID=jason

# Database URL (if using external database)
DATABASE_URL=your_database_url

# Server Port
PORT=5000
```

### Voice Configuration

1. Get an API key from [ElevenLabs](https://elevenlabs.io)
2. Add it to your `.env` file
3. Optionally configure a specific voice ID for Jason

## Usage

### Creating a Project

1. Click the **"+"** button in the main dashboard
2. Enter a project name and description
3. Jason will analyze the requirements and generate features
4. Review and approve the project plan
5. Watch as Jason autonomously builds your project

### Voice Communication

1. Open any project and go to the **Input** tab
2. Click the **phone icon** to start a voice call with Jason
3. Click the **microphone** to record your voice
4. Jason will respond with both voice and text
5. View screenshots and proof of work in nested notifications

### Code Access (Desktop Only)

1. Open any project and go to the **Code** tab
2. Browse the project file system in the left sidebar
3. Click any file to view and edit its contents
4. Use the built-in editor with syntax highlighting
5. Save changes directly to the file system

### Project Management

- **Progress Tab**: Track feature completion and milestones
- **Input Tab**: Communicate with Jason via text or voice
- **Logs Tab**: Review all project activities and decisions
- **Output Tab**: Approve content and manage deliverables
- **Sales Tab**: Monitor revenue and performance metrics

## Architecture

### Backend (Node.js + TypeScript)
- **Express.js** server with RESTful API
- **WebSocket** support for real-time updates
- **PostgreSQL** database with Drizzle ORM
- **Puppeteer** for browser automation and screenshots
- **ElevenLabs** integration for voice synthesis

### Frontend (React + TypeScript)
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Radix UI** for accessible components
- **React Query** for data fetching
- **WebSocket** client for real-time updates

### Desktop (Electron)
- **Electron** for cross-platform desktop app
- **File system access** for code editing
- **Native menus** and keyboard shortcuts
- **Auto-updater** support (configurable)
- **Crash reporting** and error handling

## Building for Distribution

### macOS
```bash
npm run electron:build -- --mac
```

### Windows
```bash
npm run electron:build -- --win
```

### Linux
```bash
npm run electron:build -- --linux
```

### All Platforms
```bash
npm run electron:build
```

## Troubleshooting

### Voice Features Not Working
- Check that `ELEVENLABS_API_KEY` is set in your `.env` file
- Verify your ElevenLabs account has sufficient credits
- Check the browser console for error messages

### Desktop App Won't Start
- Ensure Node.js 18+ is installed
- Run `npm install` to install dependencies
- Check that the backend server is running on port 5000

### File System Access Issues
- Ensure the app has proper permissions
- Check that the project directory exists
- Verify file paths are correct

### Performance Issues
- Close unused projects to free memory
- Check system resources (CPU, RAM)
- Restart the application if needed

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

- **Documentation**: [GitHub Wiki](https://github.com/your-org/titan/wiki)
- **Issues**: [GitHub Issues](https://github.com/your-org/titan/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/titan/discussions)

## Roadmap

### Version 1.1
- [ ] Multi-language voice support
- [ ] Advanced code editor with IntelliSense
- [ ] Project templates and presets
- [ ] Team collaboration features

### Version 1.2
- [ ] Mobile companion app
- [ ] Cloud synchronization
- [ ] Advanced analytics dashboard
- [ ] Plugin system

### Version 2.0
- [ ] AI-powered code generation
- [ ] Automated testing integration
- [ ] Deployment automation
- [ ] Enterprise features

---

**Built with ❤️ by the Titan Team**
