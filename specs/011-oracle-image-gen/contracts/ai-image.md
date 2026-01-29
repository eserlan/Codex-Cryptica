# AI Contract: Image Generation (Nano Banana / Gemini 2.5 Flash Image)

## Request
**Endpoint**: `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent`
**Headers**:
- `Authorization: Bearer [USER_API_KEY]`
- `Content-Type: application/json`

**Body**:
```json
{
  "instances": [
    {
      "prompt": "[PROMPT_TEXT] (derived from user query + vault context)"
    }
  ],
  "parameters": {
    "sampleCount": 1,
    "aspectRatio": "1:1",
    "safetySetting": "block_none"
  }
}
```

## Response (Success)
**Status**: 200 OK
**Body**:
```json
{
  "predictions": [
    {
      "bytesBase64Encoded": "[BASE64_IMAGE_DATA]",
      "mimeType": "image/png"
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
