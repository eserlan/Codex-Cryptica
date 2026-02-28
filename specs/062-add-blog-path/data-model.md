# Data Model: Blog Article

## Entity: BlogArticle

Represents a single blog post.

| Field       | Type     | Description                                           | Validation                                 |
| ----------- | -------- | ----------------------------------------------------- | ------------------------------------------ |
| id          | string   | Unique identifier (used for loading)                  | Required, unique                           |
| slug        | string   | URL-friendly name (e.g., 'gm-guide-data-sovereignty') | Required, unique, alphanumeric with dashes |
| title       | string   | Display title of the article                          | Required                                   |
| description | string   | Short summary for index and SEO                       | Required                                   |
| keywords    | string[] | SEO keywords                                          | Required                                   |
| publishedAt | string   | ISO date of publication                               | Required                                   |
| content     | string   | Full Markdown content of the article                  | Required                                   |

## Relationships

- **BlogIndex**: A collection of `BlogArticle` entities sorted by `publishedAt` descending.
