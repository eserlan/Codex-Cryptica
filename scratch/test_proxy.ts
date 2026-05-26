const apiKey =
  process.env.VITE_SHARED_GEMINI_KEY ||
  "AIzaSyAli7WnnjOiNEFBezJnKADXFfC11JxwNZ8";

async function testGoogle(payload: any, label: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;
  console.log(`\n--- Testing direct Google REST API [${label}] ---`);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    console.log("Status:", response.status);
    const text = await response.text();
    try {
      const data = JSON.parse(text);
      if (data.error) {
        console.log("Error response:", JSON.stringify(data.error, null, 2));
      } else {
        console.log("Success! Has candidates:", !!data.candidates);
      }
    } catch {
      console.log("Text response:", text);
    }
  } catch (e) {
    console.error("Fetch threw:", e);
  }
}

async function runAll() {
  // Test with systemInstruction object (this matches our production code payload)
  await testGoogle(
    {
      contents: [
        { role: "user", parts: [{ text: "Hello from Codex Cryptica!" }] },
      ],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Achernar" },
          },
        },
      },
      systemInstruction: {
        parts: [{ text: "Speak in a mysterious tone." }],
      },
    },
    "With systemInstruction object",
  );

  // Test without systemInstruction
  await testGoogle(
    {
      contents: [
        { role: "user", parts: [{ text: "Hello from Codex Cryptica!" }] },
      ],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Achernar" },
          },
        },
      },
    },
    "Without systemInstruction",
  );
}

runAll();
