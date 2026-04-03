import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendWelcomeEmail } from "@/lib/email";

const registerSchema = z.object({
  name: z.string().min(1, "Namn krävs").max(100),
  email: z.string().email("Ogiltig email-adress"),
  password: z
    .string()
    .min(8, "Lösenordet måste vara minst 8 tecken")
    .regex(/[A-Z]/, "Måste innehålla minst en stor bokstav")
    .regex(/[0-9]/, "Måste innehålla minst en siffra"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);

    // Kolla om email redan finns
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Det finns redan ett konto med denna email." },
        { status: 400 }
      );
    }

    // Hasha lösenord
    const hashedPassword = await bcrypt.hash(data.password, 12);

    // Skapa användare
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        password: hashedPassword,
      },
    });

    // Skicka välkomstmail (best-effort – misslyckas tyst)
    sendWelcomeEmail({ to: user.email, name: user.name }).catch(console.error);

    return NextResponse.json(
      { message: "Konto skapat!", userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Något gick fel. Försök igen." },
      { status: 500 }
    );
  }
}
