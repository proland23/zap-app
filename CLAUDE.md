# ZAP App — Claude Code Instructions
## Rest & Recharge Inc · restandrechargeinc.com

You are a top 5% React Native / Expo developer and UI/UX designer
working on the ZAP app for Rest & Recharge Inc. Every screen,
component, and animation must be visually exceptional and
consistent with the brand identity below.

---

## Brand Identity

**App name:** ZAP by Rest & Recharge
**Tagline:** Charge. Stay. Eat. Ride. Fly.
**Feel:** Futuristic, premium, dark, cinematic. Think Tesla UI
meets Zaha Hadid architecture. Every screen should feel like
it belongs in an Apple keynote.

---

## Color System

```
Background primary:   #050D18  (deep space navy)
Background card:      #0A1929  (dark card surface)
Background elevated:  #0E2035  (slightly lighter surface)
Accent gold:          #F5A623  (primary brand color)
Accent gold dark:     #D4891A  (pressed state)
Accent cyan:          #00D4FF  (EV energy, charging)
Accent green:         #1F9B6B  (available/success)
Accent purple:        #6B3FA0  (premium/Phase 3)
Text primary:         #FFFFFF
Text secondary:       #C8D8EC
Text muted:           #7A90AA
Border subtle:        rgba(255,255,255,0.06)
Border visible:       rgba(255,255,255,0.12)
Border gold:          rgba(245,166,35,0.3)
```

---

## Typography Rules

- Display headings: bold, letter-spacing 2px, uppercase
- Section titles: bold, letter-spacing 1px
- Body text: DM Sans or System font, weight 400, line-height 1.6
- Labels/tags: 10-11px, letter-spacing 2px, uppercase, muted color
- Numbers/stats: bold, gold color, large size
- NEVER use generic system fonts for display text
- NEVER use pure white (#FFF) on dark backgrounds for body — use #C8D8EC

---

## Component Standards

### Cards
- Background: rgba(10, 25, 41, 0.8)
- Border: 1px solid rgba(255,255,255,0.08)
- Border radius: 20px
- Glassmorphism on hero cards: backdrop blur when possible
- Selected/active state: gold border + subtle gold background glow
- Shadow: none (dark theme, shadows don't work)

### Buttons
- Primary: gold background #F5A623, navy text #050D18, bold, 
  border-radius 14px, height 52px, uppercase, letter-spacing 1px
- Secondary: transparent, gold border, gold text
- Destructive: #C0392B background
- Disabled: opacity 0.4, no interaction
- All buttons: scale(0.97) on press, haptic feedback

### Inputs
- Background: #0A1929
- Border: 1px solid rgba(255,255,255,0.12)
- Border on focus: 1px solid #F5A623
- Text: #FFFFFF
- Placeholder: #7A90AA
- Border radius: 12px
- Height: 52px
- Padding: 0 16px

### Bottom Sheets
- Background: #0E2035
- Top border radius: 24px
- Handle bar: rgba(255,255,255,0.2), 40px wide, 4px tall
- Use @gorhom/bottom-sheet library

### Navigation
- Tab bar background: rgba(5, 13, 24, 0.95)
- Active tab: gold icon + gold label
- Inactive tab: #7A90AA icon + #7A90AA label
- Top border: 1px solid rgba(245,166,35,0.1)
- No default tab bar shadow

---

## Animation Standards

ALWAYS use Reanimated 3 for animations. Never use Animated API.

```javascript
// Standard spring config — use for most transitions
const springConfig = {
  damping: 15,
  stiffness: 120,
  mass: 1,
};

// Snappy spring — for quick interactions
const snappySpring = {
  damping: 20,
  stiffness: 200,
};

// Gentle spring — for large elements
const gentleSpring = {
  damping: 18,
  stiffness: 80,
};
```

- Haptic feedback on ALL primary button taps: Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
- Medium haptic on booking confirmations
- Heavy haptic on errors
- 60fps minimum — test on real device
- Fade + slide for screen transitions (not the default push)
- Scale + fade for modals
- Spring bounce on card selection

---

## The Carousel (Core Component)

The home screen carousel is the defining UI moment of the app.

- Use Reanimated 3 + PanGestureHandler
- 3D perspective: perspective(600)
- Off-center cards: rotateY(±18deg), scale(0.80), opacity(0.5)
- Centered card: scale(1.0), rotateY(0), opacity(1), gold glow
- Card size: 190x290px
- Snap to center with spring physics
- Haptic on each card snap
- Dots indicator below with animated active dot width

---

## Screen Structure

Every screen must follow this pattern:

```javascript
// 1. StatusBar: dark-content, translucent
// 2. SafeAreaView with background #050D18
// 3. ScrollView or FlatList (never nested scroll)
// 4. Content sections with consistent 24px horizontal padding
// 5. Bottom safe area padding for tab bar
```

---

## File Structure

```
zap-app/
├── src/
│   ├── components/      # Reusable UI components
│   ├── screens/         # One file per screen
│   ├── navigation/      # Stack and tab navigators
│   ├── hooks/           # Custom React hooks
│   ├── services/        # Supabase, Stripe, API calls
│   ├── stores/          # Zustand state management
│   ├── utils/           # Helper functions
│   ├── types/           # TypeScript interfaces
│   └── config.ts        # API keys and constants
├── assets/              # Images, fonts, Lottie files
├── app.config.js        # Expo config
├── .env                 # Secret keys (never commit)
└── CLAUDE.md            # This file
```

---

## Tech Stack

- Framework: React Native + Expo SDK 51+
- Navigation: Expo Router (file-based)
- Animations: Reanimated 3 + Gesture Handler
- Backend: Supabase (auth + database + realtime)
- Payments: Stripe React Native
- Crypto payments: Coinbase Commerce
- Maps: React Native Maps + Google Maps SDK
- Push notifications: OneSignal + Expo Notifications
- Analytics: PostHog
- Crash reporting: Sentry
- Subscriptions: RevenueCat
- State management: Zustand
- Icons: Custom SVG (no emoji in UI)
- Lottie animations: lottie-react-native

---

## Business Context

**Company:** Rest & Recharge Inc (Georgia C-Corporation)
**EIN:** 39-4328122
**Station:** I-20 Exit 183, Columbia County, Georgia
**Coordinates:** 33.5543, -82.3018
**Contact:** invest@restandrechargeinc.com · (706) 250-0282
**Website:** www.restandrechargeinc.com

**Phase 1 (Live):** EV charging, lodging, dining, retail, dog park
**Phase 2 (2029):** Robotaxi fleet, battery swapping
**Phase 3 (2032):** eVTOL vertiport, hydrogen fueling, 10 stations

---

## Code Quality Rules

- TypeScript everywhere — no any types
- Every component gets a Props interface
- No inline styles on reusable components — use StyleSheet.create
- All API calls go in src/services/ — never in components
- Error states on every screen — never leave user with blank screen
- Loading states on every async operation
- Accessibility labels on all interactive elements
- Test on real device before considering anything done
