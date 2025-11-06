# Analytics Dashboard - Quick Start Guide

**Last Updated:** 2025-11-05 | **Version:** 1.0.3

---

## 🚀 5-Minute Quick Start

### Generate Your First Report

```bash
# 1. Build project
npm install && npm run build

# 2. Run test analytics
npx tsx scripts/test-analytics.ts

# 3. Open report
open test-analytics-report.html
```

**Expected Output:** 117 KB self-contained HTML with:
- ✅ Full-screen hero section (your persona + MBTI)
- ✅ 10 achievement badges
- ✅ 365-day contribution heatmap
- ✅ 8-card Wrapped Story (swipeable)

---

## 📂 Where Is Everything?

### Core Files (Start Here)

```
src/domain/services/analytics/
├── AnalyticsService.ts              ← Main orchestrator (starts here)
├── DeveloperPersonaService.ts       ← 8 personality types + MBTI
├── AchievementService.ts            ← 10 achievement badges
├── ConversationHeatmapService.ts    ← GitHub-style heatmap
└── WrappedStoryService.ts           ← 8-card story generator

src/infrastructure/rendering/analytics/
└── AnalyticsDashboardTemplate.ts    ← HTML/CSS/JS generator (2500 lines!)
```

### Test & Scripts

```
scripts/
└── test-analytics.ts                ← Generate test report

tests/
└── (existing test suite)
```

---

## 🎯 Common Tasks

### Add New Achievement Badge

**File:** `src/domain/services/analytics/AchievementService.ts`

```typescript
// In constructor, add to this.achievements map:
this.achievements.set('my_badge', (convs, report, heatmap) => {
    const count = convs.length; // Your condition logic here

    return {
        id: 'my_badge',
        name: 'My Badge',
        icon: '🎯',
        description: 'Badge description',
        criteria: 'How to unlock this badge',
        rarity: 'rare',  // common | rare | epic | legendary
        unlocked: count >= 50,
        progress: Math.min(count / 50, 1),
        category: 'activity'  // activity | consistency | exploration | mastery
    };
});
```

**Test:** `npm run build && npx tsx scripts/test-analytics.ts`

---

### Add New Developer Persona

**File:** `src/domain/services/analytics/DeveloperPersonaService.ts`

```typescript
// 1. Add persona definition in getAllPersonas():
{
    id: 'my_persona',
    name: 'My Persona',
    emoji: '🎯',
    description: 'Short description of this type',
    traits: [
        'Trait 1',
        'Trait 2',
        'Trait 3',
        'Trait 4'
    ],
    score: 0,
    mbti: 'INTJ',  // Choose appropriate MBTI
    mbtiDescription: 'The [Archetype] - What this means'
}

// 2. Add scoring logic in calculatePersonaScore():
case 'my_persona':
    score += activity.nightPercentage * 2;  // Example scoring
    score += learning.breadth > 10 ? 3 : 0;
    break;
```

**MBTI Reference:**
- **INTJ** - The Architect (strategic, systematic)
- **ENTP** - The Innovator (curious, exploratory)
- **ENFP** - The Champion (enthusiastic, creative)
- **ISFJ** - The Defender (methodical, reliable)
- **ISTJ** - The Logistician (focused, detailed)
- **ESTP** - The Entrepreneur (action-oriented, fast)

---

### Modify Hero Section

**File:** `src/infrastructure/rendering/analytics/AnalyticsDashboardTemplate.ts`

**Change Colors:**
```typescript
// Line ~336: Update gradient
background: linear-gradient(135deg, #YOUR_COLOR_1 0%, #YOUR_COLOR_2 50%, #YOUR_COLOR_3 100%);
```

**Change Title:**
```typescript
// Line ~1178: Update hero title
<h1 class="hero-title">Your Custom Title</h1>
```

**Change CTA Button:**
```typescript
// Line ~1191: Update button text
<button class="hero-cta">Your Custom CTA</button>
```

---

### Add New Story Card

**File:** `src/domain/services/analytics/WrappedStoryService.ts`

```typescript
// 1. Add to StoryCardType union (line 7):
export type StoryCardType =
    | 'welcome'
    | 'my_new_card'  // Add here
    | 'share';

// 2. Create content interface:
export interface MyNewCardContent {
    type: 'my_new_card';
    myData: string;
}

// 3. Add to StoryCardContent union (line 38):
export type StoryCardContent =
    | WelcomeContent
    | MyNewCardContent  // Add here
    | ShareContent;

// 4. Create card generator:
private generateMyNewCard(report: AnalyticsReport): StoryCard {
    return {
        type: 'my_new_card',
        index: 2,  // Card position
        title: 'My Card Title',
        subtitle: 'My subtitle',
        content: {
            type: 'my_new_card',
            myData: 'Some data'
        },
        theme: 'gradient-blue'  // or purple, orange, dark, light
    };
}

// 5. Add to generateStory() flow (line 109):
cards.push(this.generateMyNewCard(report));
```

**Then add rendering in `AnalyticsDashboardTemplate.ts`:**

```typescript
// In generateStoryCard(), add case (line ~1665):
case 'my_new_card':
    contentHtml = `
        <h2 class="card-title-small">${card.title}</h2>
        <div class="my-content">${card.content.myData}</div>
    `;
    break;
```

---

## 🎨 Style Customization

### Change Heatmap Colors

**File:** `AnalyticsDashboardTemplate.ts` (line ~736)

```css
.heatmap-cell[data-level="0"] { background: #ebedf0; }  /* No activity */
.heatmap-cell[data-level="1"] { background: #9be9a8; }  /* Low */
.heatmap-cell[data-level="2"] { background: #40c463; }  /* Medium */
.heatmap-cell[data-level="3"] { background: #30a14e; }  /* High */
.heatmap-cell[data-level="4"] { background: #216e39; }  /* Max */
```

---

### Change Achievement Rarity Colors

**File:** `AnalyticsDashboardTemplate.ts` (line ~1570)

```typescript
const rarityColors: Record<string, string> = {
    common: '#94a3b8',    // Gray
    rare: '#3b82f6',      // Blue
    epic: '#a855f7',      // Purple
    legendary: '#f59e0b'  // Gold
};
```

---

### Modify Section Order

**File:** `AnalyticsDashboardTemplate.ts` (line ~80)

```html
<main class="dashboard-container">
    <!-- TIER 2: SOCIAL PROOF -->
    ${report.achievements ? this.generateAchievementsSection(report) : ''}
    ${report.heatmap ? this.generateHeatmapSection(report) : ''}

    <!-- TIER 3: IDENTITY -->
    ${this.options.includeTechStack ? this.generateTechStackSection(report) : ''}
    ${this.options.includeWordCloud ? this.generateWordCloudSection(report) : ''}

    <!-- Reorder or add sections here -->
</main>
```

---

## 🐛 Troubleshooting

### Heatmap Not Showing

**Symptom:** Empty white box

**Fix:**
```bash
# Check conversations have dates
npx tsx -e "
const service = new AnalyticsService();
console.log('Testing heatmap...');
// Add your test code
"
```

**Common Cause:** Test data has no valid timestamps

---

### Achievements Not Unlocking

**Symptom:** All badges locked at 0%

**Check:**
1. Conversation count: `report.statistics.totalConversations`
2. Heatmap generated: `report.heatmap !== undefined`
3. Achievement logic: Review condition in `AchievementService.ts`

---

### Persona Always Same

**Symptom:** Every report shows "Tech Explorer"

**Fix:**
```typescript
// Add debug logging in DeveloperPersonaService.ts classifyPersona()
const scores = personas.map(p => ({
    ...p,
    score: this.calculatePersonaScore(p, activity, learning, heatmap)
}));
console.log('Persona scores:', scores.map(p => `${p.name}: ${p.score}`));
```

**Common Cause:** Insufficient data (< 5 conversations)

---

### Swiper Not Working

**Symptom:** Can't swipe between cards

**Check:**
1. Open browser console (F12)
2. Look for: `Uncaught ReferenceError: Swiper is not defined`
3. Verify CDN loaded: Check Network tab for `swiper-bundle.min.js`

**Fix:** CDN may be blocked. Check internet connection.

---

## 📊 Key Metrics

### Current State (2025-11-05)

| Metric | Value | Target |
|--------|-------|--------|
| Bundle Size | 117 KB | < 150 KB |
| Personas | 8 types | - |
| Achievements | 10 badges | - |
| Story Cards | 8 cards | - |
| Heatmap Days | 365 days | - |
| Build Time | ~5 seconds | < 10s |

---

## 🔗 Learn More

**Full Documentation:**
- `docs/ANALYTICS_HANDOVER.md` - Complete handover (50+ pages)
- `README.md` - Project overview
- `CLAUDE.md` - Development commands

**Code References:**
- Architecture: See `ANALYTICS_HANDOVER.md` → "Architecture Overview"
- Algorithms: See individual service files (JSDoc comments)
- Design: See `ANALYTICS_HANDOVER.md` → "Design Philosophy"

---

## 💡 Pro Tips

1. **Always rebuild after changes:**
   ```bash
   npm run build && npx tsx scripts/test-analytics.ts
   ```

2. **Use browser DevTools:**
   - Right-click report → Inspect
   - Check Console for errors
   - Use Network tab to verify CDN loads

3. **Test with real data:**
   ```bash
   # Replace mock data in test-analytics.ts
   # Or run against actual conversation directory
   show-me-the-talk ~/path/to/conversations
   ```

4. **Keep it lightweight:**
   - Avoid adding large libraries
   - Minify if possible
   - Target: < 150 KB total

5. **Version CDN URLs:**
   - Always specify version (e.g., `@4.4.0`)
   - Don't use `@latest` (breaks caching)

---

## 🎯 Next Steps

**If you're new to the codebase:**

1. ✅ Run quick start (top of this doc)
2. ✅ Generate test report
3. ✅ Open in browser and explore
4. ✅ Read `AnalyticsService.ts` (main orchestrator)
5. ✅ Try adding a simple achievement
6. ✅ Review full handover doc when ready

**If you're making changes:**

1. ✅ Read relevant section in `ANALYTICS_HANDOVER.md`
2. ✅ Make changes
3. ✅ Test with `npm run build && npx tsx scripts/test-analytics.ts`
4. ✅ Verify in browser
5. ✅ Update this doc if you add patterns

---

**Need Help?**
- Check `ANALYTICS_HANDOVER.md` → "Troubleshooting" section
- Review code comments in the relevant service file
- Look at existing patterns (copy/modify)

**Happy Coding!** 🚀
