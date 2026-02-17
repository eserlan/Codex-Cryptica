# Data Model: Campaign Date Picker

## Entities

### CampaignCalendar

Represents the rules for time in the specific campaign vault.

| Field        | Type              | Description                                   | Validation          |
| ------------ | ----------------- | --------------------------------------------- | ------------------- |
| useGregorian | `boolean`         | Whether to use the standard 12-month calendar | Default: true       |
| months       | `CalendarMonth[]` | List of months in order                       | Zero or more months |
| daysPerWeek  | `number`          | Days in a week (optional)                     | > 0                 |
| epochLabel   | `string`          | The year 0 label (e.g. "AF")                  | Optional            |

### CalendarMonth

| Field | Type     | Description                  |
| ----- | -------- | ---------------------------- |
| id    | `string` | Unique identifier (slug)     |
| name  | `string` | Display name (e.g. "Hammer") |
| days  | `number` | Number of days in this month |

## Relationships

- **Campaign** (Vault Metadata) `1 -- 1` **CampaignCalendar**
- **TemporalMetadata** (Entity Field) `N -- 1` **CampaignCalendar** (via validation logic)

## State Transitions

N/A - Primarily static configuration with reactive UI updates.
