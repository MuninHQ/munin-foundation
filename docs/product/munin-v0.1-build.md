# Munin v0.1 Build

## Vertical slice
The first implementation proves the loop:

`structured context -> SITREP -> action -> execution -> event -> updated context`

## Run
```bash
npm install
npm test
npm start -- sitrep
npm start -- action add P1 "Ship first vertical slice"
npm start -- execute <action-id> "Vertical slice shipped"
npm start -- sitrep
```

To start from the example state:
```bash
mkdir -p data/runtime
cp data/example/state.json data/runtime/state.json
npm start -- sitrep
```

## Architecture
- `ContextStore`: local JSON state and append-only JSONL events.
- `MuninService`: domain operations and state transitions.
- `generateSitrep`: deterministic projection of state and events.
- `cli`: thin command interface.

## Next increments
1. Project mutation commands.
2. Decision resolution.
3. Event-based change windows.
4. Career opportunity module in a private data store.
5. Trust controls for export, correction, and deletion.
6. Web dashboard only after the operating loop is validated.
