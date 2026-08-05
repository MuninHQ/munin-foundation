# Munin Workspace — Getting Started

## Requirements

- Node.js 20 or newer
- npm

## First run

```bash
npm install
npm run workspace
```

The launcher starts the local API and the web interface, then opens the browser at `http://127.0.0.1:5173`.

Press `Ctrl+C` in the terminal to stop both processes.

## First-use checklist

1. Open **Projects** and register the initiatives you are actively managing.
2. Open **Career** and add current opportunities, interviews and follow-ups.
3. Open **Research** and create the questions you want Munin to track.
4. Add your immediate actions and priorities.
5. Return to **Command Center** and generate the first SITREP with `Ctrl+K`.

## Data location

Munin stores local operational data under the configured data directory. Keep this directory private and include it in your normal backup routine.

## Troubleshooting

### Browser does not open

Open `http://127.0.0.1:5173` manually.

### API disconnected

Confirm that port `4310` is free. You may start the services separately:

```bash
npm run api
npm run web
```

### Web port is already in use

Vite will select another available port and print it in the terminal.
