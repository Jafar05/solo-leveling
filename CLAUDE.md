# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

React Native RPG-style personal development app built with Expo. Gamifies real-life self-improvement — users log activities, gain XP, level up 9 character stats, complete quests, and receive AI-generated coaching insights via DeepSeek.

## Commands

```bash
npm start              # Start Expo dev server (scan QR with Expo Go)
npm run ios            # iOS simulator
npm run android        # Android emulator
npm run web            # Web browser
npm run ios:device     # Release build on physical iOS device
```

No test suite is configured.

## Architecture

### Layers

```
src/
├── engine/      # Pure business logic (XP, AI, quests, decay, seasons, titles)
├── store/       # Zustand state (persisted to AsyncStorage — no backend)
├── screens/     # 5 tab screens (Hero, Quests, Log, Stats, Profile)
├── components/  # Reusable UI pieces
├── navigation/  # Bottom tab + stack setup
├── data/        # Static action categories and quest templates
└── theme/       # Color palette, typography, spacing, stat colors/labels
```

### State Management

All state is Zustand + AsyncStorage (local-first, offline). Key stores:
- `useCharacterStore` — stats, XP, action logs, streaks, daily stats
- `useQuestStore` — quest progress and generation
- `useJournalStore` — daily evening reflection entries
- `useProfileStore` — titles and achievements
- `useSettingsStore` — user settings, DeepSeek API key

### RPG Game Systems (`engine/`)

**9 Character Stats**: `str`, `int`, `cha`, `soc`, `biz`, `vit`, `wil`, `sty`, `kar`

**XP Calculation** (`engine/xp.ts`) — stacked multipliers:
- Base rate: 0.25–0.55 XP/min per stat
- Difficulty: 0.75× / 1.0× / 1.5×
- Streak bonus: up to 2.5× at 60+ days
- Combo bonus: up to 1.5× for hitting all 9 stats in one day
- Diminishing returns at high levels: 0.4×–0.85× at level 30+
- XP curve: `150 * 1.15^level`
- Character level = average of 9 stats + 15% bonus if balanced

**Decay System**: Each stat has an inactivity threshold (3–21 days). Missing it causes level-loss penalty.

**Rank System**: E (novice) → D → C → B → A → S (legend)

**Seasons** (`engine/seasons.ts`): Rotating 1.3× bonus to specific stats.

**Skill Tree** (`engine/skillTree.ts`): Passive XP bonuses unlocked at stat level thresholds.

### AI Integration (`engine/ai.ts`, `engine/questAI.ts`)

Uses **DeepSeek** via OpenAI SDK (`base URL: https://api.deepseek.com`, model: `deepseek-chat`). API key stored in `useSettingsStore`.

Three main features:
1. **Activity Parsing** — user writes free text → AI determines stat, difficulty, duration, XP bonus, multi-stat gains
2. **Quest Generation** — adaptive daily/story/boss quests based on behavioral profile
3. **Journal Analysis** — parses evening reflections, extracts weak areas, suggests books and actions

**Adaptive Engine** (`engine/adaptiveEngine.ts`): Analyzes action logs for consistency/balance patterns, generates personalized coaching insights shown on HeroScreen.

### Navigation

Bottom tab (5 tabs): Hero → Quests → Log (center FAB-style) → Stats → Profile

Entry point: `index.ts` → `App.tsx` → `AppNavigator` + `JournalBlockerModal` (blocks app each evening until reflection is logged)

### Design System (`theme/index.ts`)

Dark RPG theme. Background `#0A0A0F`, cards `#12121A`, primary accent `#4F6EF7`. Each stat has its own color and emoji. Stat labels and UI copy are in **Russian**.
