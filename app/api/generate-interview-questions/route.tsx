export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import ImageKit from "imagekit";
import { Buffer } from "buffer";
import axios from "axios";

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY!,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT!,
});

export async function POST(req: NextRequest) {
  try {
    console.log("🔥 Route hit");
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      throw new Error("No valid file received");
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload PDF
    const uploaded = await imagekit.upload({
      file: buffer,
      fileName: `${Date.now()}-${file.name}`,
    });

    console.log("📄 Uploaded PDF:", uploaded.url);

    // Call n8n
    const n8nResponse = await axios.post(
      "http://localhost:5678/webhook/generate-interview-question",
      { resumeUrl: uploaded.url }
    );

    console.log("🟢 N8N Response:", n8nResponse.data);

    // ---- Extract output from different shapes ----
    let output = [];

    if (
      Array.isArray(n8nResponse.data?.questions) &&
      n8nResponse.data.questions.length > 0 &&
      Array.isArray(n8nResponse.data.questions[0].output)
    ) {
      output = n8nResponse.data.questions[0].output;
    } else if (Array.isArray(n8nResponse.data)) {
      output = n8nResponse.data;
    } else if (Array.isArray(n8nResponse.data?.output)) {
      output = n8nResponse.data.output;
    }

    // ---- FINAL FLATTEN FIX ----
    // If the structure is output → [ { output: [...] } ]
    if (
      Array.isArray(output) &&
      output.length === 1 &&
      Array.isArray(output[0]?.output)
    ) {
      output = output[0].output;
    }

    return NextResponse.json(
      {
        url: uploaded.url,
        output: output,
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("🔥 ERROR:", e?.message, e);
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
