# AI Contract: Image Generation (Gemini Multimodal Output)

## Request

**Endpoint**: `POST https://generativelanguage.googleapis.com/v1beta/models/[MODEL_NAME]:generateContent`
**Headers**:

- `Content-Type: application/json`

**Body**:

```json
{
  "contents": [
    {
      "parts": [
        {
          "text": "[PROMPT_TEXT] (derived from user query + vault context)"
        }
      ]
    }
  ],
  "generationConfig": {
    "response_modalities": ["IMAGE"]
  }
}
```

## Response (Success)

**Status**: 200 OK
**Body**:

```json
{
  "candidates": [
    {
      "content": {
        "parts": [
          {
            "inlineData": {
              "data": "[BASE64_IMAGE_DATA]",
              "mimeType": "image/png"
            }
          }
        ]
      }
    }
  ]
}
```

## Response (Error)

**Status**: 4xx/5xx
**Body**:

```json
{
  "error": {
    "message": "[HUMAN_READABLE_ERROR]",
    "status": "[ERROR_CODE]"
  }
}
```
