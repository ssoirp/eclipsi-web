import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    const { rows: comarques } = await sql`SELECT DISTINCT comarca FROM espais_lleure ORDER BY comarca`;
    const { rows: municipis } = await sql`SELECT DISTINCT municipality FROM espais_lleure ORDER BY municipality`;
    const { rows: categories } = await sql`SELECT DISTINCT category FROM espais_lleure ORDER BY category`;
    return NextResponse.json({
      comarques: comarques.map((r) => r.comarca),
      municipis: municipis.map((r) => r.municipality),
      categories: categories.map((r) => r.category),
    });
  } catch (error) {
    console.error("Facets espais error:", error);
    return NextResponse.json({ comarques: [], municipis: [], categories: [] });
  }
}
