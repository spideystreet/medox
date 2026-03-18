<div align="center">

# Medox

**AI-powered drug interaction checker for French healthcare professionals.**

Built on official BDPM & ANSM data. Powered by Mistral.

<p>
  <img src="https://img.shields.io/badge/status-experimental-orange.svg" alt="Experimental">
  <img src="https://img.shields.io/badge/python-3.11+-blue.svg" alt="Python 3.11+">
  <img src="https://img.shields.io/badge/LLM-Mistral-FF7000.svg" alt="Mistral">
  <img src="https://img.shields.io/badge/Agent-LangGraph-1C3C3C.svg" alt="LangGraph">
</p>

<img src="docs/landing-preview.png" alt="Medox Landing Page" width="700" />

</div>

## What it does

You ask a question about a drug — Medox queries the official French databases in real-time and gives you a sourced answer.

- **Interaction checking** — cross-references the ANSM Thesaurus (contraindications, precautions)
- **Generic lookup** — finds all generics for a given drug via BDPM
- **RCP access** — retrieves the official Summary of Product Characteristics

The agent never guesses. Every answer comes with CIS codes and ANSM constraint levels.

## Quickstart

```bash
uv sync && cp .env.example .env
docker compose up -d
uv run dotenv -f .env run -- uv run dagster asset materialize --select '*'
uv run dotenv -f .env run -- uv run langgraph dev
```

Frontend at `localhost:5177` — Backend at `localhost:2024`

## Stack

```
BDPM + ANSM → Dagster → dbt (PostgreSQL) → ChromaDB → LangGraph ReAct Agent → React Frontend
```

> **Disclaimer:** Medox is experimental. It does not replace professional medical advice.
