"use client"

import { useCallback, useEffect, useState } from "react"

import { cn } from "../utils"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "./carousel"

export type CarouselWithThumbsItem = {
  id: string
  src: string
  alt?: string
}

/**
 * ReUI c-carousel-10 pattern: main slide + overlay thumbnail strip.
 * Accepts real image URLs (presigned, blob, static) instead of demo picsum slides.
 */
export function CarouselWithThumbs({
  items,
  className,
}: {
  items: CarouselWithThumbsItem[]
  className?: string
}) {
  const [mainApi, setMainApi] = useState<CarouselApi>()
  const [thumbApi, setThumbApi] = useState<CarouselApi>()
  const [selectedIndex, setSelectedIndex] = useState(0)

  const onThumbClick = useCallback(
    (index: number) => {
      if (!mainApi || !thumbApi) return
      mainApi.scrollTo(index)
    },
    [mainApi, thumbApi]
  )

  const onSelect = useCallback(() => {
    if (!mainApi || !thumbApi) return
    const index = mainApi.selectedScrollSnap()
    setSelectedIndex(index)
    thumbApi.scrollTo(index)
  }, [mainApi, thumbApi])

  useEffect(() => {
    if (!mainApi) return
    onSelect()
    mainApi.on("select", onSelect)
    mainApi.on("reInit", onSelect)
    return () => {
      mainApi.off("select", onSelect)
      mainApi.off("reInit", onSelect)
    }
  }, [mainApi, onSelect])

  useEffect(() => {
    setSelectedIndex(0)
    mainApi?.scrollTo(0, true)
  }, [items, mainApi])

  if (items.length === 0) return null

  return (
    <div className={cn("group relative w-full overflow-hidden rounded-xl", className)}>
      <Carousel setApi={setMainApi} className="w-full">
        <CarouselContent>
          {items.map((item, index) => (
            <CarouselItem key={item.id}>
              <div className="relative aspect-video w-full overflow-hidden bg-muted">
                {/* Plain <img>: caller-provided URLs (presigned/blob), not Next-optimizable */}
                <img
                  src={item.src}
                  alt={item.alt ?? `Slide ${index + 1}`}
                  width={1200}
                  height={675}
                  className="h-full w-full object-cover"
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {items.length > 1 ? (
        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/60 to-transparent p-4 transition-opacity duration-300">
          <div className="relative mx-auto w-full max-w-md">
            <Carousel
              setApi={setThumbApi}
              opts={{
                containScroll: "keepSnaps",
                dragFree: true,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-2 flex-row">
                {items.map((item, index) => (
                  <CarouselItem
                    key={item.id}
                    className="basis-1/4 cursor-pointer pl-2 sm:basis-1/8"
                    onClick={() => onThumbClick(index)}
                  >
                    <div
                      className={cn(
                        "relative aspect-square overflow-hidden rounded-md border-2 transition-all duration-300",
                        index === selectedIndex
                          ? "border-white opacity-100 ring-2 ring-black/20"
                          : "border-white/40 opacity-50 hover:opacity-80"
                      )}
                    >
                      {/* Plain <img>: caller-provided URLs (presigned/blob), not Next-optimizable */}
                      <img
                        src={item.src}
                        alt={item.alt ?? `Thumb ${index + 1}`}
                        width={200}
                        height={200}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </div>
        </div>
      ) : null}
    </div>
  )
}
