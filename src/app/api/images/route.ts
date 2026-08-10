import { NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import sharp from "sharp";
import { sql } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const locationId = formData.get("location_id") as string;

    if (!file || !locationId) {
      return NextResponse.json({ error: "Missing file or location_id" }, { status: 400 });
    }

    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const webpBuffer = await sharp(inputBuffer)
      .rotate()
      .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const webpName = file.name.replace(/\.[^.]+$/, "") + ".webp";
    const blob = await put(`eclipsi/${locationId}/${webpName}`, webpBuffer, {
      access: "public",
      contentType: "image/webp",
    });

    await sql`
      INSERT INTO images (location_id, url) VALUES (${Number(locationId)}, ${blob.url})
    `;

    return NextResponse.json({ success: true, url: blob.url });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id, url } = await request.json();
    await del(url);
    await sql`DELETE FROM images WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
