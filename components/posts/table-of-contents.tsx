"use client"

import { useEffect, useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import type { TocHeading } from "@/lib/toc-utils"

interface TableOfContentsProps {
  headings: TocHeading[]
  className?: string
}

// Scroll offset to account for sticky header (in pixels)
const SCROLL_OFFSET = 100

// IntersectionObserver margins:
// - Top: offset for sticky header
// - Bottom: only consider top 30% of viewport for active heading detection
const OBSERVER_ROOT_MARGIN = "-80px 0px -70% 0px"

export function TableOfContents({ headings, className }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>("")

  // Set up Intersection Observer for scrollspy
  useEffect(() => {
    if (headings.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        // Filter to only visible entries with positive top (not scrolled past)
        const visibleEntries = entries.filter(
          (entry) => entry.isIntersecting && entry.boundingClientRect.top >= 0
        )

        if (visibleEntries.length > 0) {
          // Get the heading closest to the top of the viewport
          const closest = visibleEntries.reduce((prev, curr) => {
            return prev.boundingClientRect.top < curr.boundingClientRect.top
              ? prev
              : curr
          })
          setActiveId(closest.target.id)
        }
      },
      {
        rootMargin: OBSERVER_ROOT_MARGIN,
        threshold: 0,
      }
    )

    // Observe all headings
    headings.forEach((heading) => {
      const element = document.getElementById(heading.id)
      if (element) {
        observer.observe(element)
      }
    })

    return () => observer.disconnect()
  }, [headings])

  // Handle click for smooth scrolling
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
      e.preventDefault()
      const element = document.getElementById(id)
      if (element) {
        const offsetTop =
          element.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET
        window.scrollTo({
          top: offsetTop,
          behavior: "smooth",
        })
        setActiveId(id)
        // Update URL hash without jumping
        window.history.pushState(null, "", `#${id}`)
      }
    },
    []
  )

  // Don't render if no headings
  if (headings.length === 0) {
    return null
  }

  return (
    <nav className={cn(className)} aria-label="Table of contents">
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-4">
          目錄
        </h2>
        <ul className="space-y-1 text-sm list-none pl-0">
          {headings.map((heading) => (
            <li
              key={heading.id}
              className={cn("before:hidden", heading.level === 3 && "pl-3")}
            >
              <a
                href={`#${heading.id}`}
                onClick={(e) => handleClick(e, heading.id)}
                className={cn(
                  "block py-1 transition-colors duration-200",
                  "hover:text-primary",
                  activeId === heading.id
                    ? "text-primary font-medium"
                    : "text-muted-foreground"
                )}
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
