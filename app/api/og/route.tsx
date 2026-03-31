import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const fontData = readFileSync(
  join(process.cwd(), "public/fonts/NotoSansTC-Bold.ttf")
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const title = searchParams.get("title");
    const description = searchParams.get("description");

    return new ImageResponse(
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "white",
          backgroundImage:
            "radial-gradient(circle at 25px 25px, lightgray 2%, transparent 0%), radial-gradient(circle at 75px 75px, lightgray 2%, transparent 0%)",
          backgroundSize: "100px 100px",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 60,
            fontFamily: '"Noto Sans TC", sans-serif',
            fontStyle: "normal",
            color: "black",
            marginBottom: 30,
            whiteSpace: "pre-wrap",
            lineHeight: 1.2,
            maxWidth: "800px",
          }}
        >
          {title}
        </div>
        {description && (
          <div
            style={{
              fontSize: 30,
              fontFamily: '"Noto Sans TC", sans-serif',
              fontStyle: "normal",
              color: "gray",
              whiteSpace: "pre-wrap",
              lineHeight: 1.2,
              maxWidth: "800px",
              display: "-webkit-box",
              WebkitLineClamp: "2",
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {description}
          </div>
        )}
      </div>,
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: "Noto Sans TC",
            data: fontData,
            style: "normal" as const,
            weight: 700 as const,
          },
        ],
      }
    );
  } catch (e: any) {
    console.log(`${e.message}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
