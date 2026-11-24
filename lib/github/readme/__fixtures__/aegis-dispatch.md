# Aegis Dispatch

[![CI](https://github.com/Decuayer/aegis-dispatch/actions/workflows/ci.yml/badge.svg)](https://github.com/Decuayer/aegis-dispatch/actions) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

Emergency dispatch simulator :rotating_light:

![Architecture](https://github.com/Decuayer/aegis-dispatch/raw/main/docs/images/architecture.png)

> [!NOTE]
> Requires Node 20.

> [!WARNING]
> Not for real emergencies.

## Flow

```mermaid
flowchart LR
  Call --> Triage --> Dispatch
```

```mermaid
stateDiagram-v2
  [*] --> Idle
  Idle --> EnRoute
```

## Features

| Feature | Status |
| ------- | :----: |
| Triage  |   ✅   |

- [x] Map view
- [ ] ~~Voice~~

## Documents

- [Design report](https://github.com/Decuayer/aegis-dispatch/blob/main/docs/design-report.pdf)
- [User manual](docs/user-manual.pdf)

## Installation

```bash
npm install
```

See [Installation](#installation) and [contributing](./CONTRIBUTING.md).
