import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { writeFile } from 'fs/promises';

export async function POST(request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json({ error: "No file received." }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = Date.now() + "_" + file.name.replaceAll(" ", "_");

        // Resolve path: Dashboard is in /dashboard/
        // We want to go up one level to root, then into data/remote_uploads
        // process.cwd() should be .../dashboard
        const uploadDir = path.join(process.cwd(), '../data/remote_uploads');

        // Ensure directory exists
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, filename);

        await writeFile(filePath, buffer);

        console.log(`Saved file to ${filePath}`);

        return NextResponse.json({ Message: "Success", status: 201 });

    } catch (error) {
        console.log("Error occurred ", error);
        return NextResponse.json({ Message: "Failed", status: 500 });
    }
}
