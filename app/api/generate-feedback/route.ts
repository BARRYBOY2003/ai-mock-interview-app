// app/api/generate-feedback/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { questions, answers } = await req.json();
    const GEMINI_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_KEY) throw new Error("Missing GEMINI_API_KEY");

    // Ensure arrays
    const qs: string[] = Array.isArray(questions) ? questions : [];
    const as: string[] = Array.isArray(answers) ? answers : [];

    const prompt = `
You are an HR recruiter. Evaluate the interview based on the following:

Questions:
${qs.map((q: string, i: number) => `${i + 1}. ${q}`).join("\n")}

Answers:
${as.map((a: string, i: number) => `${i + 1}. ${a}`).join("\n")}

Provide feedback including:
- Strengths
- Weaknesses
- Communication quality
- Professionalism
- Overall rating (1–10)
`;

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // Minimal change: include role so the model receives the text as a user message
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
        }),
      }
    );

    const data = await resp.json();

    const result =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      data?.candidates?.[0]?.content?.[0]?.text ||
      "No feedback generated.";

    return NextResponse.json({ feedback: result });
  } catch (err: any) {
    console.error("Feedback error:", err);
    return NextResponse.json(
      { error: err.message ?? String(err) },
      { status: 500 }
    );
  }
}
