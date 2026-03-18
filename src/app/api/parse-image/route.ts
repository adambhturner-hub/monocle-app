import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import * as admin from 'firebase-admin';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
}

export async function POST(req: Request) {
    try {
        // 1. Verify Authentication
        const authHeader = req.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized: Missing or invalid token' }, { status: 401 });
        }

        const idToken = authHeader.split('Bearer ')[1];
        try {
            await admin.auth().verifyIdToken(idToken);
        } catch (error) {
            console.error('Token verification failed:', error);
            return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
        }

        // 2. Parse payload
        const { imageUrl } = await req.json();

        if (!imageUrl) {
            return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
        }

        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json({ error: 'OpenAI API key is missing' }, { status: 500 });
        }

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `You are an intelligent task parsing assistant. 
Your goal is to extract actionable task information from the provided image.
Return a structured JSON object with the following fields:
- title: A concise, actionable title for the task.
- description: Any relevant context, details, or notes found in the image. Leave empty if none.
- launchDate: If a specific date or time frame is mentioned (e.g., "next Tuesday", "tomorrow morning", "Oct 12th"), extract it as an ISO 8601 string (YYYY-MM-DDTHH:mm:ss.sssZ). Provide the exact time if one is specified, otherwise default to the start of the date mentioned. If no date is found, leave as null. Assume the current year is ${new Date().getFullYear()} if not specified.

Always return ONLY raw valid JSON inside your response, without any markdown formatting or code blocks. Do not wrap the JSON in \`\`\`json ... \`\`\`. 

Example response:
{
  "title": "Review Q3 Marketing Deck",
  "description": "Feedback needed on slides 4-7 regarding the new user acquisition strategy. Ensure metrics are updated.",
  "launchDate": "2024-10-12T09:00:00.000Z"
}`
                },
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Please extract the task details from this image." },
                        {
                            type: "image_url",
                            image_url: {
                                "url": imageUrl,
                            },
                        },
                    ],
                },
            ],
            response_format: { type: "json_object" },
            max_tokens: 300,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error("No content returned from OpenAI");
        }

        const parsedTask = JSON.parse(content);

        return NextResponse.json(parsedTask);
    } catch (error: any) {
        console.error('Error parsing image:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to parse image' },
            { status: 500 }
        );
    }
}
