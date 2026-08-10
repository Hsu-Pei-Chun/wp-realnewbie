// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./pagination";

describe("Pagination", () => {
  it("renders a nav landmark labeled for pagination", () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink href="#">1</PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );

    expect(
      screen.getByRole("navigation", { name: "pagination" })
    ).toBeInTheDocument();
  });

  it("marks the active page link with aria-current", () => {
    render(
      <PaginationContent>
        <PaginationLink href="#" isActive>
          2
        </PaginationLink>
      </PaginationContent>
    );

    expect(screen.getByText("2")).toHaveAttribute("aria-current", "page");
  });

  it("renders accessible previous/next controls", () => {
    render(
      <PaginationContent>
        <PaginationPrevious href="#" />
        <PaginationNext href="#" />
      </PaginationContent>
    );

    expect(
      screen.getByRole("link", { name: "Go to previous page" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Go to next page" })
    ).toBeInTheDocument();
  });
});
