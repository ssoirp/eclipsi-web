import { NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { sql } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const locationId = formData.get("location_id") as string;

    if (!file || !locationId) {
      return NextResponse.json({ error: "Missing file or location_id" }, { status: 400 });
    }

    const blob = await put(`eclipsi/${locationId}/${file.name}`, file, {
      access: "public",
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
